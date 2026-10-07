# CurvyGirlReviews

Next.js App Router + strict TypeScript + Tailwind CSS 4 + Sanity Studio 6 and official next-sanity 13. Implemented from the approved static site in `/Users/shandyward/Documents/sites/html/curvygirlreviews/`. The original is retained in `legacy/`; that directory is not publicly served by Next.js. No deployment has been published.

## Visitor wishlist

Product cards offer **Save to wishlist** and visitors can open `/wishlist` from the navigation or footer. No account, database, or Sanity user is created. Only product IDs are stored in this browser's `localStorage`, under `curvygirlreviews:wishlist:v1`, with a 200-item limit. The list survives refresh and browser restarts, synchronizes tabs on the same origin, and is removed by **Clear wishlist** or clearing site data. Private browsing may clear it when the session closes. It does not synchronize devices or reserve products. The page displays current catalog data and retains saved IDs for unavailable/deleted products so they can return later; it never trusts stored prices, images, or purchase links. Blocked storage and failed writes have explicit messages. `/wishlist` is noindex and excluded from the sitemap. Demo product saves remain local and do not become production products. This is separate from the editorial **My Faves** page.

## Local development

Working TypeScript, TSX, JavaScript, CSS, JSON, and Markdown files use Prettier for readable source formatting. Run `npm run format` to format them or `npm run format:check` to verify formatting. The pinned development dependency and `.prettierrc.json` keep formatting consistent. VS Code workspace settings enable format-on-save when the **Prettier – Code formatter** extension (`esbenp.prettier-vscode`) is installed. Generated files, environment files, assets, screenshots, and the preserved legacy prototype are excluded. Source files remain readable; `npm run build` lets Next.js optimize/minify the generated production JavaScript and CSS in `.next` without rewriting the source.

Use Node 24 LTS (minimum 22.12; your default Node 16 is too old).

```sh
cd /Users/shandyward/Sites/nextjs/curvygirlreviews
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Populate the environment values below and restart after changes. For a local design preview only, set `ENABLE_DEMO_CONTENT=true`. The three legacy reviews and placeholder photos are isolated in `lib/demo.json`, labeled in the UI, never seeded to Sanity, and disabled in production regardless of this switch. No fabricated verified review content, listing status, or ratings are introduced. Without Sanity configuration, routes render the approved structural copy, neutral reserved photo areas, and honest empty states.

With demo content enabled, `/shop` displays 16 clearly labeled local sample products when Sanity has no products with slugs (or Sanity is unconfigured). Fixtures in `lib/demo-products.ts` cover all four availability states, categories, brands, sizes, prices, sorting, and two pages of results. They use the existing pink hanger asset as an explicit placeholder, have no real Vinted links, and show a disabled sample purchase button for available items. No data is scraped or written to Sanity. Real Sanity products take precedence; provider failures are not hidden by samples. Set `ENABLE_DEMO_CONTENT=false` to remove them, or add real products in Studio. Production always disables the fixtures even if the flag is true.

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

Browser verification (start development with demo enabled first):

```sh
npx playwright install chromium
npm run test:browser
```

The full `site.spec.ts` fixture suite expects Sanity and submission providers to be unconfigured, with demo reviews enabled. Do not run its submission test against live integrations. For a configured local project with an empty closet and demo products enabled, run `npx playwright test tests/browser/archive-filters.spec.ts`: these tests do not submit contact/newsletter forms. They cover native dropdown keyboard behavior, independent search and selected-filter outlines, multiple selections, price bounds, URL history, reset, and automated accessibility rules at desktop/mobile sizes. Filter reference screenshots are saved as `docs/verification/shop-*-1440.png` and `shop-*-390.png`.

Screenshot comparison (two running local servers):

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory legacy
# In another terminal: ENABLE_DEMO_CONTENT=true npm run dev -- --hostname 127.0.0.1
node scripts/compare-design.mjs
```

Artifacts and observations are in `docs/verification/`. Browser checks cover desktop/mobile routes, automated WCAG rule checks, reflow, search/history, keyboard dialog trapping/restoration, and form/preview failure boundaries. Passing checks do not establish full WCAG compliance. Review real editorial photos, captions, copy, screen reader behavior, and integration forms before release.

## Sanity project and editing

1. Create or select your Sanity project and a **public** content dataset at https://sanity.io/manage. This app intentionally uses published public content without a read token. A private dataset requires an explicit server-read configuration change; never expose its token.
2. Add `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` to `.env.local`. These identifiers are not secrets. There are no invented project identifiers. The unconfigured Studio guard prevents initializing a Studio without your project identifiers.
3. Allow your local origin and your actual Vercel/domain origins in Sanity API CORS with credentials for authenticated Studio use. Restrict allowed origins to the ones you use. Invite editors with appropriate Sanity roles.
4. Visit `/studio` and sign in with Sanity. Create clothing categories, brands, authors, and blog categories. Use the singleton Homepage, About page, and Site settings documents from the sidebar. Their IDs are `homepage`, `aboutPage`, `siteSettings`.
5. Upload owned/authorized photos, fill meaningful alt descriptions and crop/hotspot, then publish. Create reviews/posts with slugs, publication dates, authors, body, and SEO; future publication dates are not public (authenticated preview can show drafts/future articles). Create closet products with their Vinted URL and known availability. Link products to reviews only from the product side; review pages find them using a reverse query.

The schemas constrain editing to the approved layouts. There is no general page builder. Historical review price and current listing price remain distinct. My Faves is still a published review collection, not a product store. The existing header has Reviews/About/My Faves/Contact and is preserved. No internal shop existed; `/shop` adds the established archive/card pattern. The configured Vinted shop URL is available on the shop page. Closet purchase actions use validated Vinted listings; curated finds use configured HTTPS retailer links. Sold/reserved items retain their reviews. Affiliate links carry nearby disclosures. No cart, checkout, database, or WordPress is added.

Existing `/about/`, `/reviews/`, `/my-faves/`, `/privacy/` resolve. `*/index.html` gets a permanent redirect. Known legacy `?review=<id>` links resolve to the canonical review slug; unknown IDs show a not-found response. Source sample IDs only exist in development demo mode. Before publishing real content, preserve any additional legacy ID mappings in the redirect table if those URLs have been distributed.

## Preview and publishing refresh

Draft previews mount the official `next-sanity/visual-editing` bridge and enable Sanity text annotations pointing to `/studio`. Public requests have neither the bridge nor annotations. No separate `@sanity/visual-editing` installation is needed: the official Next.js integration provides it. If Presentation reports that visual editing cannot connect, restart the development server after changing environment variables, reopen Presentation, and confirm the preview shows the Draft preview banner. Configure the exact frontend origin (including its port) in Sanity's API CORS settings with **Allow credentials** enabled, and allow cookies/local storage in the preview iframe. A missing or invalid server-side Viewer token prevents draft activation; check the `/api/draft/enable` request in browser developer tools.

The coherent refresh strategy is **time-based Sanity fetch caching**: published queries use `perspective: 'published'`, `useCdn: false`, and Next.js `revalidate: 300`. After publishing, the first request after the cache expires refreshes the content; stale content can serve during revalidation, and failed refreshes preserve last known content. No webhook or write token is needed for public refresh. Active browser pages refresh on navigation/reload; this implementation does not claim instant live updates.

Create a scoped Viewer token and set server-only `SANITY_API_READ_TOKEN` for editor preview. Open the Studio **Presentation** tool: it uses `/api/draft/enable`, the official `defineEnableDraftMode` helper, to validate a Sanity preview secret before setting the httpOnly draft cookie. Draft fetches use the server token, `perspective: 'drafts'`, and `cache: 'no-store'`. Reload/navigate the preview after edits. Exit using the preview banner or `/api/draft/disable`. No browser token or token in a public environment variable is used. Studio and API paths are excluded from indexing; draft responses are noindex, and sitemap queries always explicitly use published perspective independently of editor cookies.

## Search and content routes

Routes: `/`, `/about`, `/reviews`, `/reviews/[slug]`, `/blog`, `/blog/[slug]`, `/shop`, `/shop/closet`, `/shop/finds`, `/shop/[slug]`, `/support`, plus preserved `/my-faves` and `/privacy`. Content is server rendered. Homepage search goes to reviews; Latest Verdicts always uses the three most recent published reviews independently of query state.

Archives filter the entire matching collection before sorting/counting/paginating (12/page). Parameters: `q`, repeated `category`, `brand`, `size`, `format`, `condition`, `retailer`, `tried`, legacy shopping `availability`, `min_price`, `max_price`, `sort`, `page`. Groups combine with AND and selections within a group with OR. Sorting: newest, title, and historical/listing price when a single known currency supports meaningful comparison. Unknown prices sort last. Forms reset pagination on apply, use progressively enhanced GET forms with client navigation and scroll preservation, and preserve refresh/history state without client data filtering. Filter/search URLs are noindex with the archive canonical. Reset clears search and filters. Reviews and product shopping are separate collections.

## Product import

See [docs/IMPORTING.md](docs/IMPORTING.md) for the versioned JSON format, dry runs, stable identity, field ownership, partial failure handling, and safe reruns. No scraper or private endpoint is used. Set `SANITY_API_WRITE_TOKEN` only locally for live imports; it is not needed on Vercel.

## Request and newsletter integrations

Review requests should be delivered to **contact@curvygirlreviews.com**. Configure this recipient server-side in the delivery adapter; do not accept a recipient address from the submitted form. An email delivery provider still needs to be selected and connected before requests can be delivered.

The approved request dialog and newsletter styling are preserved. There was no existing backend to reuse. The API at `/api/forms` validates with Zod, bounds payload size, checks same-origin submission, and rejects a hidden honeypot. Client forms expose pending/errors through live status regions and keep data for retry. With no configured adapter, the service returns 503 and explicitly says nothing was submitted.

Newsletter signup now supports MailerLite directly; no separate adapter or additional package is required. Create a group named **CurvyGirlReviews Newsletter** under Subscribers → Groups. Under Integrations → MailerLite API → Use, generate a token named **CurvyGirlReviews website** and copy the group's numeric ID from the Groups section. Put them in server-only `MAILERLITE_API_TOKEN` and `MAILERLITE_GROUP_ID` in `.env.local` and restart development. Leave `NEWSLETTER_ENDPOINT` and `NEWSLETTER_TOKEN` blank when using this integration. Set both MailerLite variables in Vercel when deploying. If either MailerLite variable is set, the direct integration takes precedence; incomplete configuration fails without sending anything.

In MailerLite Account settings → Subscribe settings, enable **Double opt-in for API and integrations**, and customize the confirmation email/thank-you page. The API upserts an email into the configured group without forcing an active status or resubscribing suppressed addresses. A successful provider response must contain a subscriber ID, matching email, and active/unconfirmed status; unconfirmed readers see a confirmation instruction and active readers see an accurate subscribed message. Malformed responses, provider errors, timeouts, and suppressed statuses never report success. Enable the API double opt-in setting before accepting signups; the application cannot inspect this account setting. Finish MailerLite's sender/domain authentication and account approval requirements. Keep unsubscribe links in campaigns.

After configuration, use an address you own to test the footer form: check that the subscriber appears in the correct MailerLite group, receives the confirmation email, becomes active after confirmation, and can unsubscribe. Verify retry behavior and existing subscribers too. Local automated tests use mocked provider responses and do not prove delivery. API tokens stay on the server and must never use a `NEXT_PUBLIC_` prefix. Official setup: [API token and group ID](https://www.mailerlite.com/help/where-to-find-the-mailerlite-api-key-groupid-and-documentation), [API double opt-in](https://www.mailerlite.com/help/how-to-use-double-opt-in-when-collecting-subscribers), [subscriber API](https://developers.mailerlite.com/api/subscribers).

Supply an HTTPS adapter in `REVIEW_REQUEST_ENDPOINT` and/or `NEWSLETTER_ENDPOINT` and optional server-only bearer tokens. The adapter accepts JSON `{kind,email,name?,product?,notes?,website?}`, stores the request or delivers to a real provider, then returns **2xx JSON `{ "accepted": true }` only after durable acceptance**. Newsletter delivery should implement consent/double opt-in and unsubscribe. A provider error, timeout, redirect, or absent acceptance acknowledgment never produces success. The adapter is a trusted operator-configured integration point, not a user-supplied URL. Configure rate limiting at the provider/Vercel edge for public release; no unreliable in-memory serverless rate limit is presented as durable protection. Do not log submitted personal data. The preserved privacy policy is a template from the prototype and must be brought into line with the actual providers and data practices.

## Environment and Vercel

Copy `.env.example`; do not commit `.env.local` or tokens. Supply:

- Sanity project ID and public dataset name.
- Viewer token for editor previews; Editor token only for local imports.
- Actual `SITE_URL` HTTPS canonical origin (no invented domain). Without it sitemap is empty and canonical metadata lacks a public origin.
- MailerLite API token and newsletter group ID; provider adapter URLs/tokens for review-request delivery or an alternative newsletter integration.
- Publish owned photography, real reviews/posts/products, homepage/About content, social profiles, Vinted shop URL, contact details, and default SEO in Studio.
- An authorized product feed and image assets if importing; transcripts/captions for video.

For Vercel, import this repository, choose Next.js, Node 24, install `npm ci`, build `npm run build`, and keep default output settings. Set identifiers, SITE_URL, preview Viewer token, and form integration values for the appropriate Preview/Production environments. Do not set the import write token on Vercel. Add the actual deployment origins to Sanity CORS. Sanity environment changes require a rebuild because Studio uses public identifiers. Review the verification report and dependency audit before deployment. This task prepares configuration only; it does not publish.

## Official references used

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Next.js fetch caching](https://nextjs.org/docs/app/api-reference/functions/fetch)
- [Official next-sanity integration](https://github.com/sanity-io/next-sanity)
- [Sanity Next.js integration](https://www.sanity.io/docs/nextjs)
- [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)

### Review gifts

In Studio, open **Site settings → My Review Wishlist URL**, paste your full HTTPS view-only Amazon wishlist link, and publish. The `/support` page then includes **Shop My Review Wishlist**. The Request a Review dialog links to this page alongside the existing **Suggest an item** form. Leave the URL blank to hide the modal support section and show an unavailable message on the support page. The visitor saved-items wishlist remains separate.

Set the delivery address, exact sizes/colors, and sharing permissions on Amazon. Test gift checkout and visible address information before sharing. For items outside the list, visitors should submit a suggestion first; confirm the item and add its correct variant before they purchase. Gifts are optional and do not guarantee a review or a positive opinion. No purchase or shipping details are collected by this site. Published settings refresh using the existing five-minute cache; draft preview can show the link before publishing.

### Shopping sections and review support

- `/shop` remains the existing default closet URL. `/shop/closet` and `/shop/finds` are shareable section routes. Sections sit above clothing filters and expose only their own categories and options. Switching sections clears filters and pagination.
- In Studio → Shopping item, choose **Shopping section**. Missing section values on existing documents mean My Vinted Closet. Use the existing Vinted URL or **Purchase link** for closet listings. For Curated Finds, enter a retailer purchase link and retailer name. Categories continue to describe clothing types.
- Set **Personally tried** only for firsthand experience. Unselected curated items show **On my radar · Not yet tried**. Set **Purchase link earns commission** separately; curated does not imply affiliate. Disclosures appear beside monetized links.
- Closet filters cover actual size, condition, brand and price. Finds filters cover known available sizes, retailer, brand, experience and maintained prices. Set **Retailer price is reliably maintained** to expose a curated price; otherwise customers check the retailer. Never infer retail stock from size choices.
- A closet item can also have **Optional shop-new purchase link**, retailer name and its separate affiliate flag. These options share the same product/review relationship; selling the closet item leaves the shop-new link available.
- Imports keep their original JSON contract. New shopping/retailer/experience/affiliate fields are editorial and are never changed by imports. Imported records without a section remain closet items; manually supplied primary purchase links take precedence over legacy imported Vinted URLs.
- `/support` contains the Amazon gift list from Site settings. Request a Review links to Support the Reviews; gifts are separate from shopping and visitors’ saved items. An empty configured URL shows an honest unavailable state. No checkout or gift-address collection is added to the site.
