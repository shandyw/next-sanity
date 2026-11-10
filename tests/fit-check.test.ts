import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ShannequinFitCheck } from '../components/ShannequinFitCheck';
import { usableFitCheck, type FitCheck } from '../lib/fit-check';
import { articlePublicFields } from '../lib/public-projection';
import { schemaTypes } from '../sanity/schema';

const render = (value?: FitCheck, sizeWorn?: string, usualSize?: string) =>
  renderToStaticMarkup(createElement(ShannequinFitCheck, { value, sizeWorn, usualSize }));

test('legacy, disabled, and enabled-but-empty checks do not render', () => {
  assert.equal(render(), '');
  assert.equal(render({ enabled: false, testedBy: 'shandy', shandy: { overallFit: 'mixed' } }), '');
  assert.equal(render({ enabled: true, testedBy: 'shandy' }), '');
  assert.equal(render({ enabled: true, testedBy: 'both', highlights: ['bustFriendly'] }), '');
  assert.equal(
    usableFitCheck({ enabled: true, testedBy: 'shannequin', shandy: { notes: 'Good' } }),
    false,
  );
});

test('Shandy-only reports firsthand details and labeled stretch, without mannequin content', () => {
  const html = render(
    {
      enabled: true,
      testedBy: 'shandy',
      shandy: {
        overallFit: 'runsSmall',
        stretchRating: 3,
        sittingComfort: 'Comfortable while seated',
        notes: 'A little tight at the waist',
      },
    },
    '18',
  );
  assert.match(html, /Personally tested on Shandy/);
  assert.doesNotMatch(html, /Mannequin Assessment/);
  assert.doesNotMatch(html, /Size worn/);
  assert.match(html, /Runs small/);
  assert.match(html, /The fit verdict/);
  assert.match(html, /Fabric &amp; comfort/);
  assert.match(html, /Stretch: 3\/5 — Moderate stretch/);
  assert.equal((html.match(/is-filled/g) || []).length, 3);
  assert.match(html, /Comfortable while seated/);
  assert.doesNotMatch(html, /On Shannequin|Visual assessment|Shannequin Says/);
});

test('Shannequin-only is explicitly visual and never shows human comfort or stretch', () => {
  const html = render({
    enabled: true,
    testedBy: 'shannequin',
    shannequin: {
      sizeDisplayed: '18',
      visualFit: 'snug',
      drape: 'Falls straight at the hip',
    },
    shandy: { sittingComfort: 'Hidden', stretchRating: 5 },
  });
  assert.match(html, /Mannequin fit assessment/);
  assert.doesNotMatch(html, /Usual size/);
  assert.match(html, /On Shannequin · visual assessment/);
  assert.match(html, /Visual assessment on a size-18 mannequin/);
  assert.match(html, /Appears snug/);
  assert.match(html, /Falls straight at the hip/);
  assert.doesNotMatch(html, /Personally tested|Stretch:|Sitting comfort|Hidden|On Shandy/);
});

test('both testers retain separate sizes, verdicts and optional details without empty rows', () => {
  const html = render(
    {
      enabled: true,
      testedBy: 'both',
      shandy: { overallFit: 'trueToSize', bustFit: 'Roomy' },
      shannequin: { sizeDisplayed: '18', visualFit: 'loose', garmentLength: 'Below knee' },
      highlights: ['bustFriendly', 'unknown'],
    },
    'XL',
    '16/18',
  );
  assert.match(html, /Personally tested on Shandy/);
  assert.match(html, /Usual size: 16\/18/);
  assert.match(html, /Personally tested on Shandy/);
  assert.match(html, /On Shannequin/);
  assert.match(html, /Size worn.*XL/);
  assert.match(html, /Size displayed.*18/);
  assert.match(html, /True to size/);
  assert.match(html, /Appears loose/);
  assert.match(html, /Bust-friendly/);
  assert.equal((html.match(/fit-check__verdict-text/g) || []).length, 2);
  assert.match(html, /Sizing &amp; silhouette/);
  assert.match(html, /fit-check__highlights/);
  assert.doesNotMatch(html, /fit-check__details/);
  assert.doesNotMatch(html, /unknown|Waist fit|Sitting comfort|Stretch:/);
  assert.equal((html.match(/The Shannequin Fit Check/g) || []).length, 1);
});

test('Shandy observations stay in the main panel while styling notes sit with highlights', () => {
  const html = render({
    enabled: true,
    testedBy: 'shandy',
    shandy: { overallFit: 'trueToSize', waistFit: 'Snug', undergarments: 'Skin-toned bra' },
    highlights: ['shorterLength'],
  }, 'XL');
  const main = html.match(/<div class="fit-check__main">([\s\S]*?)<div class="fit-check__highlights">/)?.[1];
  assert.ok(main);
  assert.match(main, /Personally tested on Shandy · Size XL/);
  assert.match(main, /Waist/);
  assert.doesNotMatch(main, /Skin-toned bra/);
  assert.match(html, /Fit highlights/);
  assert.match(html, /Styling notes/);
  assert.match(html, /Skin-toned bra/);
});

test('Review schema and public projection include the fit check without duplicating the quote', () => {
  const review = schemaTypes.find((type) => type.name === 'review');
  assert.ok(review && 'fields' in review);
  assert.equal(review.fields?.filter((field) => field.name === 'fitCheck').length, 1);
  assert.equal(review.fields?.filter((field) => field.name === 'shannequinQuote').length, 1);
  assert.match(
    articlePublicFields,
    /reviewSections,shannequinQuote,fitCheck,finalVerdict,acquisitionSource,acquisitionNote,experienceStatus/,
  );
});
