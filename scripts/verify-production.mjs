import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const root = 'http://127.0.0.1:3001';
const results = [];
for (const path of ['/', '/about', '/reviews', '/blog', '/shop', '/privacy', '/studio']) {
  const response = await fetch(root + path);
  const html = await response.text();
  assert.equal(response.status, 200, path);
  assert.ok(!html.includes('Design preview: sample reviews'), path);
  assert.ok(!html.includes('Jeans that pass the sit test'), path);
  results.push({ path, status: response.status, demoDisabled: true });
}
const draft = await fetch(root + '/api/draft/enable');
assert.equal(draft.status, 503);
assert.equal(draft.headers.get('set-cookie'), null);
results.push({ path: '/api/draft/enable', status: 503, noCookie: true });
const detail = await fetch(root + '/reviews/t1');
assert.equal(detail.status, 404);
results.push({ path: '/reviews/t1', status: 404 });
const form = await fetch(root + '/api/forms', {
  method: 'POST',
  headers: { origin: root, 'Content-Type': 'application/json' },
  body: JSON.stringify({ kind: 'newsletter', email: 'reader@example.test' }),
});
assert.equal(form.status, 503);
assert.match(await form.text(), /Nothing was submitted/);
results.push({ path: '/api/forms', status: 503, honestUnavailable: true });
await writeFile('docs/verification/production-checks.json', JSON.stringify(results, null, 2));
console.log(
  'Production boundaries passed: public routes, demo disabled, sample details 404, preview denied, forms unavailable.',
);
