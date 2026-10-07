import type { DocumentContent } from './types';

// Local fixtures only: no real seller, listing URLs, or imported photographs.
const pieces = [
  ['Wrap dress', 'dresses'],
  ['Straight-leg jeans', 'jeans'],
  ['Cotton shirt', 'tops'],
  ['Wool cardigan', 'knitwear'],
  ['Midi skirt', 'skirts'],
  ['Denim jacket', 'jackets'],
  ['Linen trousers', 'trousers'],
  ['Printed blouse', 'tops'],
  ['Knit dress', 'dresses'],
  ['Wide-leg jeans', 'jeans'],
  ['Striped tee', 'tops'],
  ['Cable-knit jumper', 'knitwear'],
  ['Pleated skirt', 'skirts'],
  ['Lightweight blazer', 'jackets'],
  ['Cropped trousers', 'trousers'],
  ['Relaxed shirt', 'tops'],
] as const;
const states = ['available', 'reserved', 'sold', 'unknown'] as const;
const products: DocumentContent[] = pieces.map(([title, category], i) => ({
  _id: `local-sample-product-${i + 1}`,
  _type: 'product',
  slug: `local-sample-product-${i + 1}`,
  title: `Sample ${title.toLowerCase()}`,
  description:
    'Illustrative item for local layout testing. The hanger is a placeholder, not an item photo.',
  createdAt: new Date(Date.UTC(2026, 0, 16 - i)).toISOString(),
  photos: [
    { demoSrc: '/img/curvy.png', alt: 'Pink hanger branding used as a sample item placeholder' },
  ],
  categories: [{ _id: category, slug: category, title: category }],
  brand: { _id: `sample-brand-${i % 2}`, title: i % 2 ? 'Sample label B' : 'Sample label A' },
  size: i % 2 ? '18' : '16',
  condition: i % 2 ? 'Good (sample)' : 'Very good (sample)',
  listingPrice: 10 + i * 2.5,
  currency: 'USD',
  availability: states[i % states.length],
  demo: true,
}));

export function localDemoProducts(
  existing: DocumentContent[],
  env: { NODE_ENV?: string; ENABLE_DEMO_CONTENT?: string } = process.env,
): DocumentContent[] {
  if (existing.length || env.NODE_ENV === 'production' || env.ENABLE_DEMO_CONTENT !== 'true')
    return existing;
  return products;
}
