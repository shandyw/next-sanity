import { EditorialHero } from '@/components/EditorialHero';
import { getSettings } from '@/lib/content';
import { pageMetadata } from '@/lib/seo';
export const metadata = pageMetadata(
  'Privacy',
  'How CurvyGirlReviews handles form submissions, browser storage and outgoing retailer links.',
  '/privacy',
);
export default async function Privacy() {
  const settings = await getSettings();
  return (
    <main id="main" className="privacy-page__main container">
      <EditorialHero
        title="Privacy"
        intro="Information about forms, saved items, and links to other websites."
      />
      <article className="privacy-content" aria-label="Privacy information">
        <p>
          Updated <time dateTime="2026-10-18">October 18, 2026</time>.
        </p>
        <h2>Information you submit</h2>
        <p>
          Newsletter signup asks for your email address. A review request asks for an email address
          and item name or link, with optional name and notes. These details are used for the
          requested subscription or to respond to your request. Public visitors do not need an
          account to save items, and the Saved Items feature does not collect account passwords.
        </p>
        <p>
          Newsletter submissions use the site’s server-side MailerLite integration when configured,
          or its configured newsletter service adapter. Review requests go to the configured
          request-handling service. The forms report an unavailable service or failed submission
          rather than claiming that it succeeded. Contact opens your email app when a contact
          address is configured.
        </p>
        <h2>Browser storage and preview cookies</h2>
        <p>
          Your saved product IDs stay in this browser’s local storage. Clear saved items or clearing
          site data removes them. They do not sync across devices, reserve inventory, or create an
          account.
        </p>
        <p>
          The optional signup offer stores a successful-subscription flag locally and a dismissal
          flag for the current browser session. Those flags do not contain your email address.
          Studio sign-in and authorized draft preview use authentication or preview cookies for
          editors.
        </p>
        <h2>Outgoing links and measurement</h2>
        <p>
          Following an Amazon or marketplace link takes you to another website, whose privacy and
          checkout practices apply. When active, an Amazon affiliate link contains the site’s
          Associate tracking ID, not an identifier assigned to you. Amazon may use its own tracking
          technologies after you follow a link.
        </p>
        <p>
          No general analytics provider is installed by the outbound-click feature. It is disabled
          by default. If enabled and connected to a consent adapter, it emits a browser event after
          analytics consent with the product identifier, page path, placement and experience
          category. It omits email addresses, visitor IDs, search-query parameters and checkout
          data. It respects browser Do Not Track and Global Privacy Control signals. The event
          itself sends no network request and stores no data.
        </p>
        <h2>Site services</h2>
        <p>
          Sanity provides editorial content and uploaded media. Hosting, content delivery, form
          providers and email services receive the connection or submission data needed to provide
          their services. Their operational logs and retention settings depend on the owner’s
          provider configuration. No additional retention period or provider contract is promised
          here.
        </p>
        <p>
          Fonts are served by this site. No Amazon API integration, advertising pixel or automatic
          Amazon visit is installed by the wishlist importer. Imported Amazon images are not
          publicly requested by this integration.
        </p>
        <h2>Your choices and questions</h2>
        <p>
          You can choose not to submit forms, remove saved items, clear browser storage, or refrain
          from following retailer links. Newsletter messages should provide the subscription
          provider’s unsubscribe option. Ask the site owner about access, correction or removal of
          submitted information and applicable privacy rights.
        </p>
        {settings.contactEmail ? (
          <p>
            Contact: <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>.
          </p>
        ) : (
          <p>Use Contact in the navigation when contact details are available.</p>
        )}
        <p>
          See <a href="/disclosures">Disclosures & editorial approach</a> for how personal tests,
          curated finds, gifts and affiliate links are distinguished.
        </p>
      </article>
    </main>
  );
}
