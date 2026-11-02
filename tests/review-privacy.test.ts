import test from 'node:test';
import assert from 'node:assert/strict';
import { parse, evaluate } from 'groq-js';
import { acknowledgment } from '../lib/acknowledgment';
import { publicProjection } from '../lib/public-projection';

test('reader acknowledgment never reveals a name or custom message without permission', () => {
  const review = {
    readerProvided: true,
    senderDisplayName: 'Private Name',
    thankYouMessage: 'Thanks, Private Name',
    senderNamePermission: false,
  };
  assert.equal(acknowledgment({ ...review, readerProvided: false }), undefined);
  assert.doesNotMatch(acknowledgment(review)!, /Private Name/);
  assert.equal(acknowledgment({ ...review, senderNamePermission: true }), 'Thanks, Private Name');
  assert.equal(
    acknowledgment({ readerProvided: true, senderNamePermission: true, senderDisplayName: 'Reader' }),
    'Thank you, Reader, for providing this item for an honest review.',
  );
});

test('public Review projection excludes private identity and notes while retaining an approved Find link', async () => {
  const dataset = [
    {
      _id: 'review-one',
      _type: 'review',
      title: 'Review',
      slug: { current: 'review' },
      readerProvided: true,
      senderNamePermission: false,
      senderDisplayName: 'PRIVATE READER',
      thankYouMessage: 'PRIVATE THANKS',
      privateNotes: 'PRIVATE REVIEW NOTES',
      primaryFind: { _type: 'reference', _ref: 'find-one' },
    },
    {
      _id: 'find-one',
      _type: 'find',
      title: 'Approved Find',
      amazonUrl: 'https://www.amazon.com/dp/B0ABC12345',
      privateNotes: 'PRIVATE FIND NOTES',
    },
  ];
  const projected = await (
    await evaluate(parse(`*[_type == "review"]${publicProjection}`), { dataset })
  ).get();
  const review = projected[0];
  assert.equal(review.senderDisplayName, null);
  assert.equal(review.thankYouMessage, null);
  assert.equal(review.primaryFind?.title, 'Approved Find');
  for (const privateValue of ['PRIVATE READER', 'PRIVATE THANKS', 'PRIVATE REVIEW NOTES', 'PRIVATE FIND NOTES'])
    assert.doesNotMatch(JSON.stringify(review), new RegExp(privateValue));
});
