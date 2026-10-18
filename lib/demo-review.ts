import type { PortableTextBlock } from '@portabletext/types';
import type { DocumentContent } from './types';
import legacySamples from './demo.json';

type DemoEnvironment = { NODE_ENV?: string; ENABLE_DEMO_CONTENT?: string };
export const exampleReviewSlug = 'example-jeans-review';
const copy = (text: string, key: string): PortableTextBlock[] => [
  {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-text`, text, marks: [] }],
  },
];
const photos = legacySamples[0].images.map((demoSrc, index) => ({
  demoSrc,
  alt:
    index === 0
      ? 'Illustrative denim photograph for the example review; not a tested item'
      : 'Second illustrative denim photograph for the example review; not a tested item',
}));
const sample: DocumentContent = {
  _id: 'local-example-review',
  _type: 'review',
  slug: exampleReviewSlug,
  title: 'Great jeans. Questionable pockets.',
  titleHighlight: 'Questionable pockets.',
  excerpt: 'A good waist fit, with one small catch. An illustrative review to preview the layout.',
  author: { name: 'Example author' },
  publishedAt: '2026-01-01T12:00:00Z',
  featuredImage: photos[0],
  photos,
  categories: [{ _id: 'sample-jeans', slug: 'jeans', title: 'Jeans' }],
  brand: { _id: 'sample-label', title: 'Example label' },
  sizeWorn: '18',
  fitNotes: 'Sample fit notes: room through the hips and thighs; pocket depth needs a closer look.',
  titleAccent: 'Questionable pockets.',
  reviewSections: {
    firstImpression: {
      heading: 'First Impression',
      copy: copy(
        'A lovely wash, a promising shape, and pockets that looked bigger online.',
        'first',
      ),
    },
    fitComfort: {
      heading: 'Fit / Comfort',
      copy: copy(
        'Room through the hips, a comfortable waist, and enough stretch for the sit-down test.',
        'fit',
      ),
    },
    whoMightLike: {
      heading: 'Who might like this?',
      copy: copy('If you like a relaxed leg and a defined waist, these could be your pair.', 'who'),
    },
    finalTake: {
      heading: 'Final Take',
      copy: copy('I’d wear them again. My phone, however, will be travelling in my bag.', 'final'),
    },
  },
  shannequinQuote: 'I don’t even have a phone, and these pockets still disappointed me.',
  format: 'written',
  body: undefined,
  demo: true,
};
export function exampleReview(env: DemoEnvironment = process.env): DocumentContent | undefined {
  return env.NODE_ENV !== 'production' && env.ENABLE_DEMO_CONTENT === 'true' ? sample : undefined;
}
export function localDemoReviews(existing: DocumentContent[], env: DemoEnvironment = process.env) {
  const review = exampleReview(env);
  return existing.length || !review ? existing : [review];
}
