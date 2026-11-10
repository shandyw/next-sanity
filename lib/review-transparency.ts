import type { DocumentContent } from './types';

export function acquisitionDisclosure(
  review: Pick<DocumentContent, 'acquisitionSource' | 'acquisitionNote'>,
) {
  switch (review.acquisitionSource) {
    case 'selfPurchased':
      return 'Purchased myself — this item was purchased with my own money. All opinions are my own.';
    case 'brandGift':
      return 'This item was gifted by the brand. All opinions are my own.';
    case 'providedForReview':
      return 'This item was provided for review. My opinions and fit observations are my own.';
    case 'borrowed':
      return 'This item was borrowed for this review.';
    case 'other':
      return review.acquisitionNote?.trim() || undefined;
    default:
      return undefined;
  }
}
