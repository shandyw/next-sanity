import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('migration CLI produces an offline additive plan and refuses to overwrite it', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cgr-catalog-'));
  try {
    const input = join(dir, 'data.ndjson'),
      output = join(dir, 'plan.json');
    await writeFile(
      input,
      JSON.stringify({
        _id: 'existing-item',
        _rev: 'revision',
        _type: 'product',
        shoppingSection: 'finds',
        onReviewWishlist: true,
      }) + '\n',
    );
    const args = [
      '--import',
      'tsx',
      'scripts/prepare-catalog-migration.ts',
      '--input',
      input,
      '--output',
      output,
    ];
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const original = await readFile(output, 'utf8');
    const plan = JSON.parse(original);
    assert.equal(plan.mode, 'dry-run');
    assert.equal(plan.plan[0].id, 'existing-item');
    assert.equal(plan.plan[0].ifRevisionID, 'revision');
    assert.deepEqual(plan.plan[0].setIfMissing.displayPlacements, ['finds', 'reviewWishlist']);
    assert.notEqual(spawnSync(process.execPath, args, { encoding: 'utf8' }).status, 0);
    assert.equal(await readFile(output, 'utf8'), original);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
