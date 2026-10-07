import 'server-only';
import { createClient } from 'next-sanity';
import { draftMode } from 'next/headers';
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_DATASET,
);
export function sanityClient() {
  if (!configured) throw new Error('Configure the Sanity project ID and dataset.');
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
    apiVersion: '2026-09-01',
    useCdn: false,
    stega: {
      studioUrl: '/studio',
      filter: (props) => {
        // Encode editorial text, never values used for routing, comparisons, or metadata.
        const excluded = new Set([
          'slug',
          'createdAt',
          'publishedAt',
          'lastSuccessfullyCheckedAt',
          'availability',
          'currency',
          'reviewCurrency',
          'shoppingSection',
          'retailer',
          'newRetailer',
          'availableSizes',
          'size',
          'sizeWorn',
          'condition',
          'format',
          'dataSource',
          'importSource',
          'externalListingId',
          'platform',
          'contactEmail',
          'seo',
          'defaultSeo',
        ]);
        if (
          props.sourcePath.some(
            (part) => typeof part === 'string' && (excluded.has(part) || /url$/i.test(part)),
          )
        )
          return false;
        return props.filterDefault(props);
      },
    },
  });
}
export async function fetchContent<T>(
  query: string,
  params: Record<string, string | number | boolean> = {},
  allowDrafts = true,
) {
  const preview = allowDrafts && (await draftMode()).isEnabled;
  if (preview && !process.env.SANITY_API_READ_TOKEN)
    throw new Error('A server-side Sanity read token is required for preview.');
  return sanityClient().fetch<T>(query, params, {
    perspective: preview ? 'drafts' : 'published',
    stega: preview,
    token: preview ? process.env.SANITY_API_READ_TOKEN : undefined,
    ...(preview ? { cache: 'no-store' as const } : { next: { revalidate: 300, tags: ['sanity'] } }),
  });
}
