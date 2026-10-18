import { readFile, writeFile } from 'node:fs/promises';
import { poshmarkMappingSchema, convertPoshmarkInventory } from '../lib/poshmark-import';
import { z } from 'zod';
async function main() {
  const args = process.argv.slice(2);
  const value = (flag: string) => args[args.indexOf(flag) + 1];
  const allowed = new Set(['--file', '--mapping', '--checked-at', '--out', '--dry-run']);
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error('Unknown argument.');
    if (args[i] !== '--dry-run' && (!args[i + 1] || args[i + 1].startsWith('--')))
      throw new Error('Flag requires a value.');
    if (args[i] !== '--dry-run') i++;
  }
  for (const flag of ['--file', '--mapping', '--checked-at'])
    if (!args.includes(flag)) throw new Error(`Missing ${flag}.`);
  const checkedAt = z.iso
    .datetime({ offset: true })
    .refine((value) => Date.parse(value) <= Date.now())
    .parse(value('--checked-at'));
  const dry = args.includes('--dry-run');
  if (!dry && !args.includes('--out')) throw new Error('Use --out output.json or --dry-run.');
  const csv = await readFile(value('--file'), 'utf8');
  const mapText = await readFile(value('--mapping'), 'utf8');
  if (Buffer.byteLength(csv) > 10_000_000 || Buffer.byteLength(mapText) > 100_000)
    throw new Error('Input file is too large.');
  const mapping = poshmarkMappingSchema.parse(JSON.parse(mapText));
  const result = convertPoshmarkInventory(csv, mapping, checkedAt);
  console.log(JSON.stringify(result.summary));
  for (const error of result.errors) console.error(error);
  if (result.errors.length) {
    process.exitCode = 1;
    return;
  }
  if (!dry)
    await writeFile(value('--out'), JSON.stringify(result.envelope, null, 2) + '\n', {
      flag: 'wx',
    });
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Conversion failed.');
  process.exitCode = 1;
});
