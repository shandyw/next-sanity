import { readFile, writeFile } from 'node:fs/promises';
import { catalogMigrationPlan, type MigrationDocument } from '../lib/catalog-migration';
async function main() {
  const args = process.argv.slice(2);
  const input = args[args.indexOf('--input') + 1],
    output = args[args.indexOf('--output') + 1];
  if (!args.includes('--input') || !args.includes('--output') || !input || !output)
    throw Error(
      'Usage: node --import tsx scripts/prepare-catalog-migration.ts --input data.ndjson --output catalog-plan.json',
    );
  const text = await readFile(input, 'utf8');
  const docs: MigrationDocument[] = text.trim().startsWith('[')
    ? JSON.parse(text)
    : text
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
  const plan = catalogMigrationPlan(docs);
  await writeFile(
    output,
    JSON.stringify(
      {
        mode: 'dry-run',
        createdAt: new Date().toISOString(),
        instructions:
          'Review against an export backup. No network writes occur. Revision guards are required if applying these setIfMissing patches. Rollback only the added keys after reviewing post-migration edits.',
        plan,
      },
      null,
      2,
    ) + '\n',
    { flag: 'wx' },
  );
  console.log(
    `${plan.length} additive patches prepared. No dataset changes. Plan file created without overwriting existing files.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration planning failed.');
  process.exitCode = 1;
});
