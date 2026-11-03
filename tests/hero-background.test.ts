import test from 'node:test';
import assert from 'node:assert/strict';
import { safeBackgroundVideoUrl } from '../lib/urls';
import { schemaTypes } from '../sanity/schema';

test('background video accepts direct local or HTTPS media files only', () => {
  assert.equal(safeBackgroundVideoUrl('/videos/intro.mp4'), '/videos/intro.mp4');
  assert.equal(
    safeBackgroundVideoUrl('https://cdn.example.com/intro.webm?token=sample'),
    'https://cdn.example.com/intro.webm?token=sample',
  );
  for (const url of [
    '//evil.example/video.mp4',
    'http://example.com/video.mp4',
    'https://example.com/watch?v=intro.mp4',
    'javascript:alert(1)',
    '/videos/intro.mp4\\broken',
  ]) {
    assert.equal(safeBackgroundVideoUrl(url), undefined, url);
  }
});

test('About Studio exposes the optional video and copy-tone controls', () => {
  const about = schemaTypes.find((type) => type.name === 'aboutPage');
  assert.ok(about && 'fields' in about);
  const names = about.fields.map((field) => field.name);
  assert.ok(names.includes('heroVideoUrl'));
  assert.ok(names.includes('heroCopyTone'));
});
