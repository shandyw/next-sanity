import { EditorialHero } from '@/components/EditorialHero';
import { AffiliateDisclosure } from '@/components/AffiliateDisclosure';
import { getSettings } from '@/lib/content';
import { associatesActive } from '@/lib/amazon';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Disclosures & editorial approach',
  'How CurvyGirlReviews distinguishes personal tests, mannequin demonstrations, curated finds and affiliate links.',
  '/disclosures',
);
export default async function Disclosures() {
  const settings = await getSettings();
  const active = associatesActive(settings);
  return (
    <main id="main" className="container">
      <EditorialHero
        title="Disclosures & editorial approach"
        intro="What I’ve tried, what’s on my radar, and how shopping links work."
      />
      <article className="privacy-content">
        <AffiliateDisclosure active={active} />
        {!active && (
          <p>
            Amazon links are currently ordinary shopping links. This site is not currently
            presenting them as commission-earning Associate links.
          </p>
        )}
        <h2>Three kinds of experience</h2>
        <p>
          Personally tested means I have used or worn the item. My observations describe that
          experience, including the size tested and its limits. A single try-on does not establish
          long-term durability.
        </p>
        <p>
          Mannequin-only means the item has been demonstrated on Shannequin, my size-18 mannequin.
          It can help show how a garment hangs. It cannot establish human comfort, movement, or wash
          performance.
        </p>
        <p>
          Curated, not personally tested means the item caught my eye or I researched it. It is a
          selection to consider, not a first-hand review. Seller-reported details are attributed
          separately from my own observations. Check the current product page and size chart before
          purchasing.
        </p>
        <h2>Shopping and affiliate links</h2>
        <p>
          My Closet contains my own resale listings, with purchases completed on the named
          marketplace. Curated Finds lead to other retailers. You decide whether to visit a
          retailer; the site does not automatically open Amazon or redirect you there.
        </p>
        <p>
          {active
            ? 'Amazon links identified as affiliate links may earn a commission on qualifying purchases. The disclosure appears near those links. Ordinary links, including requested gift-list links, do not carry the site’s Associate tag.'
            : 'If affiliate participation is activated later, commission-earning links will be identified clearly and disclosures will appear near them.'}
        </p>
        <p>
          The retailer handles checkout, shipping, returns and its own privacy practices.
          CurvyGirlReviews does not see Amazon checkout completion. Outbound-click measurements,
          when configured with consent, are different from Amazon’s purchase and commission reports.
        </p>
        <h2>Images, prices and seller claims</h2>
        <p>
          Original or separately licensed photos are identified through the editorial workflow.
          Imported Amazon thumbnails are withheld until an appropriate permitted mechanism is
          available. Amazon prices, stock claims, discounts and customer ratings are not displayed
          from shared-list exports. The Amazon link lets you check current price and sizes directly.
        </p>
        <h2>Requests and gifts</h2>
        <p>
          Gifts are optional and do not guarantee a review or a positive opinion. My review wishlist
          uses ordinary Amazon links. A request or gift does not become evidence that I personally
          tested an item.
        </p>
        <p>
          Questions about an item or a disclosure? Use Contact in the site navigation. See the{' '}
          <a href="/privacy">privacy information</a> for how submissions and browser storage work.
        </p>
      </article>
    </main>
  );
}
