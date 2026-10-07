import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('offline CLI validates records, skips duplicate IDs, reports failures, and refuses credential-free writes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cgr-import-'));
  const file = join(dir, 'products.json');
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  delete env.NEXT_PUBLIC_SANITY_DATASET;
  delete env.SANITY_API_WRITE_TOKEN;
  const record = {
    externalListingId: '123',
    title: 'Owned jacket',
    listingPrice: 20,
    currency: 'USD',
    availability: 'unknown',
    vintedUrl: 'https://www.vinted.com/items/123-jacket',
    lastSuccessfullyCheckedAt: '2026-09-01T12:00:00Z',
  };
  const run = (dry = true) =>
    spawnSync(
      process.execPath,
      ['--import', 'tsx', 'scripts/import-products.ts', file, ...(dry ? ['--dry-run'] : [])],
      { env, encoding: 'utf8' },
    );
  try {
    writeFileSync(file, JSON.stringify({ version: 1, source: 'feed', products: [record, record] }));
    let result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"created": 1/);
    assert.match(result.stdout, /"skipped": 1/);
    result = run(false);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /require project ID/);
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        source: 'feed',
        products: [{ ...record, vintedUrl: 'http://localhost/private' }],
      }),
    );
    result = run();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /"failed": 1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
