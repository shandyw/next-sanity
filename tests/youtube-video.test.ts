import test from 'node:test';
import assert from 'node:assert/strict';
import { safeVideoUrl, youtubeEmbedUrl } from '../lib/urls';

test('local files in public/videos resolve to their browser path', () => {
  assert.equal(safeVideoUrl('/public/videos/try-on.mp4'), '/videos/try-on.mp4');
  assert.equal(safeVideoUrl('/videos/try-on.mp4'), '/videos/try-on.mp4');
  assert.equal(safeVideoUrl('//example.test/try-on.mp4'), undefined);
});

test('regular and share YouTube links become privacy-enhanced embeds', () => {
  const expected = 'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE';
  for (const url of [
    'https://www.youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtube.com/watch?v=M7lc1UVf-VE&t=12s',
    'https://m.youtube.com/watch?v=M7lc1UVf-VE',
    'https://youtu.be/M7lc1UVf-VE?si=share-token',
    'https://www.youtube.com/shorts/M7lc1UVf-VE',
    'https://www.youtube.com/embed/M7lc1UVf-VE',
  ]) {
    assert.equal(youtubeEmbedUrl(url), expected, url);
  }
});

test('YouTube embeds reject spoofed hosts, unsafe schemes, and malformed IDs', () => {
  for (const url of [
    'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE',
    'https://youtube.com@evil.test/watch?v=M7lc1UVf-VE',
    'http://youtu.be/M7lc1UVf-VE',
    'https://youtu.be/too-short',
    'https://www.youtube.com/watch?v=not-valid!',
    'https://www.youtube.com/playlist?list=M7lc1UVf-VE',
    'https://youtu.be/M7lc1UVf-VE/extra',
    'https://example.test/try-on.mp4',
  ]) {
    assert.equal(youtubeEmbedUrl(url), undefined, url);
  }
});
