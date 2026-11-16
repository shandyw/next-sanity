import type { DocumentContent, Named } from './types';

export interface HomeReviewCategory extends Named {
  count: number;
}

export function homeReviewCategories(reviews: DocumentContent[]): HomeReviewCategory[] {
  const categories = new Map<string, HomeReviewCategory>();

  for (const review of reviews) {
    if (review._id.startsWith('drafts.') || !review.publishedAt) continue;
    const counted = new Set<string>();
    for (const category of review.categories || []) {
      if (!category?.title?.trim()) continue;
      const key = category.slug || category._id;
      if (!key || counted.has(key)) continue;
      counted.add(key);
      const existing = categories.get(key);
      categories.set(key, { ...category, count: (existing?.count || 0) + 1 });
    }
  }

  return [...categories.values()].sort(
    (a, b) => b.count - a.count || a.title.localeCompare(b.title),
  );
}
