import { readFile } from 'node:fs/promises';
import { createClient } from '@sanity/client';
import {
  importEnvelopeSchema,
  importRecordSchema,
  stableProductId,
  createProduct,
  listingUpdate,
  updateDecision,
  type ExistingProduct,
} from '../lib/import-products';
async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  if (!file || args.some((a) => a.startsWith('--') && a !== '--dry-run')) {
    console.error('Usage: npm run import:products -- products.json [--dry-run]');
    process.exit(1);
  }
  const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
  try {
    const text = await readFile(file, 'utf8');
    if (Buffer.byteLength(text) > 10_000_000) throw new Error('Import file exceeds 10 MB.');
    const envelope = importEnvelopeSchema.parse(JSON.parse(text));
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
    const token = process.env.SANITY_API_WRITE_TOKEN;
    if (!dryRun && (!projectId || !dataset || !token))
      throw new Error(
        'Write runs require project ID, dataset, and server-only SANITY_API_WRITE_TOKEN.',
      );
    const client =
      projectId && dataset
        ? createClient({
            projectId,
            dataset,
            token,
            apiVersion: '2026-09-01',
            useCdn: false,
            perspective: 'raw',
          })
        : undefined;
    if (dryRun && !client)
      console.log(
        'Offline validation: proposed creates only. Remote matching and asset existence were not checked.',
      );
    const seen = new Set<string>();
    for (const [index, raw] of envelope.products.entries()) {
      const parsed = importRecordSchema.safeParse(raw);
      if (!parsed.success) {
        summary.failed++;
        console.error(
          `Record ${index + 1}: ${parsed.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; ')}`,
        );
        continue;
      }
      const r = parsed.data;
      const id = stableProductId(envelope.source, r.externalListingId);
      if (seen.has(id)) {
        summary.skipped++;
        console.log(`Record ${index + 1}: duplicate ID within file`);
        continue;
      }
      seen.add(id);
      try {
        const existing = client
          ? await client.fetch<ExistingProduct[]>(
              `*[_type=='product' && ( _id==$id || _id==$draftId || (dataSource=='import' && importSource==$source && externalListingId==$externalId))]{_id,_rev,dataSource,importSource,externalListingId,importEnabled,lastSuccessfullyCheckedAt,shoppingSection}`,
              {
                id,
                draftId: 'drafts.' + id,
                source: envelope.source,
                externalId: r.externalListingId,
              },
            )
          : [];
        if (existing.some((d) => d._id.startsWith('drafts.')) || existing.length > 1) {
          summary.skipped++;
          console.log(
            `Record ${index + 1}: draft or duplicate identity requires editorial resolution`,
          );
          continue;
        }
        if (r.photoAssetRefs?.length && client) {
          const ids = r.photoAssetRefs.map((p) => p.assetRef);
          const count = await client.fetch<number>(
            'count(*[_type=="sanity.imageAsset" && _id in $ids])',
            { ids },
          );
          if (count !== new Set(ids).size)
            throw new Error('An image asset does not exist in this dataset.');
        }
        const previous = existing[0];
        if (previous) {
          const decision = updateDecision(previous, envelope.source, r);
          if (decision !== 'update') {
            summary.skipped++;
            console.log(`Record ${index + 1}: ${decision}`);
            continue;
          }
          if (!dryRun)
            await client!
              .patch(previous._id)
              .ifRevisionId(previous._rev)
              .set(listingUpdate(r))
              .commit();
          summary.updated++;
        } else {
          if (!dryRun)
            await client!.transaction().create(createProduct(envelope.source, r)).commit();
          summary.created++;
        }
      } catch (e) {
        summary.failed++;
        console.error(`Record ${index + 1}: ${e instanceof Error ? e.message : 'Import failed'}`);
      }
    }
    console.log(JSON.stringify({ dryRun, ...summary }, null, 2));
    if (summary.failed) process.exitCode = 1;
  } catch (e) {
    console.error(e instanceof Error ? e.message : 'Import failed');
    process.exitCode = 1;
  }
}
void main();
