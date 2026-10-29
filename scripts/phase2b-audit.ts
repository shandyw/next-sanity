/** Read-only inventory of legacy product documents and their references. */
import { createClient } from '@sanity/client';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_API_READ_TOKEN;
if (!projectId || !dataset || !token) throw new Error('Sanity read configuration is required.');

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: '2026-10-01',
  useCdn: false,
  perspective: 'raw',
});
type Doc = { _id: string; _type: string; _rev?: string; title?: string; [key: string]: unknown };
void (async () => {
  const documents: Doc[] = [];
  let cursor = '';
  for (;;) {
    const page = await client.fetch<Doc[]>('*[_id > $cursor] | order(_id asc)[0...500]', {
      cursor,
    });
    if (!page.length) break;
    documents.push(...page);
    cursor = page[page.length - 1]._id;
    if (page.length < 500) break;
  }

  const targets = documents.filter((document) => document._type === 'product');
  const backupPath = 'imports/phase2b-production-2026-10-28.tar.gz';
  const backupHash = existsSync(backupPath)
    ? createHash('sha256').update(readFileSync(backupPath)).digest('hex')
    : undefined;
  const targetIds = new Set(targets.map((document) => document._id));
  const incoming: {
    sourceId: string;
    sourceType: string;
    path: string;
    targetId: string;
    weak: boolean;
  }[] = [];
  const assetUses = new Map<string, Set<string>>();

  function visit(value: unknown, source: Doc, path: string) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, source, `${path}[${index}]`));
      return;
    }
    const object = value as Record<string, unknown>;
    if (typeof object._ref === 'string') {
      if (targetIds.has(object._ref) && !targetIds.has(source._id))
        incoming.push({
          sourceId: source._id,
          sourceType: source._type,
          path,
          targetId: object._ref,
          weak: object._weak === true,
        });
      if (object._ref.startsWith('image-') || object._ref.startsWith('file-')) {
        const users = assetUses.get(object._ref) || new Set<string>();
        users.add(source._id);
        assetUses.set(object._ref, users);
      }
    }
    for (const [key, child] of Object.entries(object))
      visit(child, source, path ? `${path}.${key}` : key);
  }
  documents.forEach((document) => visit(document, document, ''));

  const sharedAssets = [...assetUses].filter(
    ([, users]) =>
      [...users].some((id) => targetIds.has(id)) && [...users].some((id) => !targetIds.has(id)),
  );
  const counts = Object.entries(Object.groupBy(documents, (document) => document._type))
    .map(([type, items]) => `${type}: ${items?.length || 0}`)
    .sort();
  const report = [
    '# Phase 2B deletion dry run',
    '',
    `Dataset: ${dataset}`,
    `Generated: ${new Date().toISOString()}`,
    `Total documents scanned: ${documents.length}`,
    `Backup: ${backupHash ? `${backupPath} (SHA-256 ${backupHash})` : 'Not found'}`,
    '',
    '## Document counts',
    '',
    ...counts.map((count) => `- ${count}`),
    '',
    `## Legacy product targets (${targets.length})`,
    '',
    ...targets.map(
      (document) =>
        `- ${document._id} (${document._id.startsWith('drafts.') ? 'draft' : 'published/other'}; source: ${document.catalogSource || document.shoppingSection || 'unspecified'}; review wishlist: ${document.onReviewWishlist === true ? 'yes' : 'no'})`,
    ),
    '',
    `## Incoming references (${incoming.length})`,
    '',
    ...(incoming.length
      ? incoming.map(
          (ref) =>
            `- ${ref.sourceType} ${ref.sourceId} → ${ref.targetId} at ${ref.path} (${ref.weak ? 'weak' : 'strong'})`,
        )
      : ['- None found']),
    '',
    `## Assets shared with non-product documents (${sharedAssets.length})`,
    '',
    ...(sharedAssets.length
      ? sharedAssets.map(([id, users]) => `- ${id}: ${[...users].join(', ')}`)
      : ['- None found']),
    '',
    'No records or assets were deleted. Deployment status and verified backup must be checked before any live mutation.',
    '',
  ].join('\n');
  writeFileSync('docs/PHASE-2B-DELETION-DRY-RUN.md', report);
  console.log(
    JSON.stringify({
      dataset,
      total: documents.length,
      targets: targets.length,
      incoming: incoming.length,
      sharedAssets: sharedAssets.length,
    }),
  );
})();
