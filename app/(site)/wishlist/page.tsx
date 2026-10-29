import { EditorialHero } from '@/components/EditorialHero';
import { SavedEditorialItems } from '@/components/SavedEditorialItems';
import { getDocuments } from '@/lib/content';
import { getLooks } from '@/lib/looks';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata(
  'Saved Items',
  'Reviews and Looks saved in this browser.',
  '/wishlist',
  true,
);

export default async function WishlistPage() {
  const [reviews, looks] = await Promise.all([getDocuments('review'), getLooks()]);
  const items = [
    ...reviews
      .filter((review) => !review.demo)
      .map((review) => ({
        id: review._id,
        title: review.title,
        href: `/reviews/${encodeURIComponent(review.slug)}`,
        type: 'Review' as const,
      })),
    ...looks.map((look) => ({
      id: look._id,
      title: look.title,
      href: `/looks/${encodeURIComponent(look.slug)}`,
      type: 'Look' as const,
    })),
  ];
  return (
    <main id="main" className="container">
      <EditorialHero
        title="Saved Items"
        intro="Keep Reviews and Looks you want to revisit. Saved in this browser only."
      />
      <SavedEditorialItems items={items} />
    </main>
  );
}
