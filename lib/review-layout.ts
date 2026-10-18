import type { ContentPhoto, DocumentContent } from './types';

export const reviewSections = [
  { key: 'firstImpression', heading: 'First Impression' },
  { key: 'fitComfort', heading: 'Fit / Comfort' },
  { key: 'whoMightLike', heading: 'Who might like this?' },
  { key: 'finalTake', heading: 'Final Take' },
] as const;
export type ReviewSectionKey = (typeof reviewSections)[number]['key'];
export function reviewPhotos(review: DocumentContent): ContentPhoto[] {
  const seen = new Set<string>();
  return [review.featuredImage, ...(review.photos || [])].filter((photo): photo is ContentPhoto => {
    if (!photo) return false;
    const key = photo.asset?._ref || photo.demoSrc;
    if (key && seen.has(key)) return false;
    if (key) seen.add(key);
    return true;
  });
}
