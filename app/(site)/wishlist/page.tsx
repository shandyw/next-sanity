import { EditorialHero } from '@/components/EditorialHero';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SavedEditorialItems } from '@/components/SavedEditorialItems';
import { ContentImage } from '@/components/ContentImage';
import { getSettings } from '@/lib/content';
import {
  getPublishedFinds,
  getPublishedLooks,
  findAmazonLink,
  lookImage,
  lookOccasionLabel,
} from '@/lib/looks';
import { findCategoryIcon, findDisplayTitle } from '@/lib/look-presentation';
import { pageMetadata } from '@/lib/seo';
import { findAsin } from '@/lib/finds';

export const metadata = pageMetadata(
  'Saved Items',
  'Finds and Looks saved in this browser.',
  '/wishlist',
  true,
);

export default async function WishlistPage() {
  const [finds, looks, settings] = await Promise.all([
    getPublishedFinds(),
    getPublishedLooks(),
    getSettings(),
  ]);
  const savedFinds = finds.map((find) => {
    const link = findAmazonLink(find, settings);
    return {
      id: find._id,
      title: findDisplayTitle(find),
      description: find.description,
      icon: findCategoryIcon(find.category?.slug),
      unavailable: find.linkStatus === 'unavailable',
      amazonHref: link?.href,
      affiliate: link?.affiliate === true,
      trackingId: findAsin(find) || find._id,
    };
  });
  const savedLooks = looks.map((look) => ({
    id: look._id,
    title: look.title,
    href: `/looks/${encodeURIComponent(look.slug)}`,
    occasion: look.occasion ? lookOccasionLabel(look.occasion) : undefined,
    image: (
      <ContentImage
        image={lookImage(look)}
        width={240}
        height={300}
        sizes="(max-width: 600px) 30vw, 120px"
      />
    ),
  }));
  return (
    <>
      <Breadcrumbs
        items={[{ label: 'Home', href: '/' }, { label: 'Saved Items', href: '/wishlist' }]}
      />
      <main id="main" className="container">
      <EditorialHero
        title="Saved Items"
        intro="Keep Finds and Looks you want to revisit. Saved in this browser only."
        layout="landscape"
        landscapeFallbackSrc="/img/hero/mirror.jpg"
      />
      <SavedEditorialItems finds={savedFinds} looks={savedLooks} />
      </main>
    </>
  );
}
