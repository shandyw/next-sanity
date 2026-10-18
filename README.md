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

- [Custom Sanity Studio tools](https://www.sanity.io/docs/studio/custom-studio-tool)
- [Sanity validation](https://www.sanity.io/docs/studio/validation)

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
- In Studio → Shopping item, choose **Shopping section**. Missing section values on existing documents mean My Closet. Use the existing Vinted URL or **Purchase link** for closet listings. For Curated Finds, enter a retailer purchase link and retailer name. Categories continue to describe clothing types.
- Set **Personally tried** only for firsthand experience. Unselected curated items show **On my radar · Not yet tried**. Set **Purchase link earns commission** separately; curated does not imply affiliate. Disclosures appear beside monetized links.
- Closet filters cover actual size, condition, brand and price. Finds filters cover known available sizes, retailer, brand, experience and maintained prices. Set **Retailer price is reliably maintained** to expose a curated price; otherwise customers check the retailer. Never infer retail stock from size choices.
- A closet item can also have **Optional shop-new purchase link**, retailer name and its separate affiliate flag. These options share the same product/review relationship; selling the closet item leaves the shop-new link available.
- Imports keep their original JSON contract. New shopping/retailer/experience/affiliate fields are editorial and are never changed by imports. Imported records without a section remain closet items; manually supplied primary purchase links take precedence over legacy imported Vinted URLs.
- `/support` contains the Amazon gift list from Site settings. Request a Review links to Support the Reviews; gifts are separate from shopping and visitors’ saved items. An empty configured URL shows an honest unavailable state. No checkout or gift-address collection is added to the site.

### First-visit marketing lead modal

In **Studio → Site settings → Marketing lead modal**, upload the column-two image (with alt text), edit the eyebrow/headline/copy/CTA, switch **Turn on Lead Modal** on, and publish. Defaults are Exclusive Offer / Get 15% Off your first order from my closet! / Cute & cheap, you can't go wrong! / Get my 15% off. It is disabled by default, excluded from Studio and automatic draft-preview display, and uses the shared published-settings cache.

The branded two-column dialog appears after 1.2 seconds and waits if another dialog is open. Close, Escape, and clicking its backdrop dismiss it for the current browser session. Only provider-accepted newsletter signups write a permanent suppression flag; footer newsletter signups also suppress it. Flags contain no email and are stored only in this browser. Clearing site data, using another device/browser, or blocking storage can cause it to appear again. Failed submissions keep the form available and never suppress future signup prompts.

Emails use the existing MailerLite group (or configured newsletter adapter), server validation, honeypot and provider acceptance checks. **Before enabling the 15% offer, configure your MailerLite welcome email/automation to deliver accurate redemption instructions for your closet.** This site does not generate discount codes, change Vinted prices or apply a checkout discount. The overlay's signup success confirms subscription/provider acceptance only. Configure the provider's confirmation and automation timing appropriately for double opt-in.

### Studio Inventory dashboard

Run `npm install` and `npm run dev` with Node 24, then open **http://localhost:3000/studio/inventory** and sign in. Inventory appears as a Studio navigation tab; it uses the logged-in user's Sanity permissions, without a browser write token or additional environment variables.

- Open **Content → Shopping item** or an inventory row's **Edit** link. Assign a string **SKU**, such as `CGR-001`; zeros are retained. Validation checks case-insensitive uniqueness against other products' drafts and published documents, excluding the edited item's own pair. Legacy SKUs remain optional; none are generated automatically. This is Studio validation, not a database uniqueness constraint: direct API writes bypass it, and editors should resolve any simultaneous duplicate assignments before publishing.
- New manual items default **Sale Status** to Available. Selecting Available/Sold synchronizes the existing listing availability in the draft; that legacy field becomes read-only once a Sale Status is assigned. Publish after reviewing the complete draft. A mismatched status/availability prevents publishing until re-selected and synchronized.
- Quick **Mark sold / Mark available** actions save only the draft. They preserve unrelated draft edits and never publish. The row and confirmation explicitly say publishing is required. Existing drafts receive revision-guarded patches; published-only products are copied into a new draft, with concurrent draft creation failing safely. Permission failures are surfaced rather than reported as success. Sold items remain editable.
- Legacy items without Sale Status use existing `availability`: available and sold map directly; reserved, unknown, or missing values appear as **Needs status** and are not counted as available. Existing data is never bulk-migrated or marked available automatically. Assign statuses individually when appropriate.
- Inventory includes `shoppingSection: closet` or the established missing-section closet fallback, excluding primary `affiliateLink: true` and Curated Finds. An optional affiliate shop-new link does not exclude an owned closet item. Drafts take precedence over published copies, including draft classification and prices; content-release versions are excluded.
- All/Available/Sold counts and summary cards use the entire deduplicated inventory, unaffected by search/filter. Asking-price totals are not revenue, are grouped by currency, and exclude missing/invalid price or currency. Unknown statuses and unpriced available items are counted separately. Price sorting groups currencies instead of implying exchange-rate conversion.
- The authenticated raw client loads documents in cursor batches of 500, then searches/sorts the complete inventory before paginating 25 rows. Refresh reloads all data, as do status updates and returning focus to the browser window. Other editors' changes within the same tab require Refresh; this dashboard does not continuously subscribe to remote changes.
- Imports reject SKU and Sale Status input. Once an explicit Sale Status exists, imports also leave its corresponding availability untouched. Imports continue updating permitted prices/URLs/check timestamps and skip outstanding drafts. Manual product editing works independently.

Verification: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`; with the dev server running, `npx playwright test tests/browser/inventory.spec.ts`. Inventory tests use isolated clients and browser fixtures, never live dataset writes. Check your logged-in account's create/update/publish permissions in Studio before using quick changes. No migration, synchronization or deployment is performed.

### Private Price This Item assistant

Inventory rows and the existing Shopping item editor now have **Price This Item**. The panel reuses item details/photos, calculates costs and offers in integer cents, accepts manual comparables and recorded sales, provides schema-validated image assessments, and records private history. Only explicit **Apply Price to Draft** changes asking price; publishing and Vinted/Poshmark listing updates remain manual. Sold items allow history/actual sales and block active price changes.

Configure server-only `SANITY_PRICING_DATASET` (separate private dataset), `PRICING_ADMIN_USER_IDS` (personal Sanity user IDs), `OPENAI_API_KEY` and `PRICING_AI_MODEL`. The existing public dataset is refused for private costs/history. Requests verify the logged-in Studio user and use their Sanity permissions without a privileged write token. Missing configuration shows setup feedback and leaves Inventory usable. See [pricing setup, privacy, calculations and recovery guidance](docs/PRICING.md).

### Shared editorial hero and image pool

Every public page uses `components/EditorialHero.tsx`. Pass `title`, optional `emphasis`, `intro`, `eyebrow`, `disclaimer`, `cta: {label, href}` and optional `scriptAccent` to vary its content. Existing homepage Sanity copy and published photo overrides remain supported. The Studio admin does not use the public hero.

Add owned or authorized JPG/JPEG/PNG/WebP/AVIF photographs to `public/img/hero/`. The supplied copies of `me2.jpg` and `mirror.jpg` can be replaced. See `public/img/hero/README.md` for supported files and crop guidance. The server randomly selects two distinct photos per page identity and caches them for five minutes. Public static pages retain their pair until regeneration; query/filter changes use the same identity. No client-side random selection or image fetch occurs, so SSR and hydration agree. Files are included in Vercel tracing; deploy again after changing the pool in production. Allow cache refresh after adding files locally.

The warm editorial theme uses Georgia bold headings, existing Manrope body/UI, and self-hosted Dancing Script 600 for short large accents. Its OFL license and WOFF2 live in `public/fonts/dancing-script/`; `next/font/local` preloads it without an external font request. Berry buttons have white labels, text links use berry, and the shared hero has staggered borderless photographs without frames/captions. Social profiles appear in the footer and a responsive socials tab. See DESIGN.md for exact tokens and accessibility rules.

Homepage search has moved to the Reviews archive. The latest three published reviews, the archive and related reviews reuse `ReviewPreview`. Studio's optional **Preview title highlight** must exactly match a phrase in a review title; existing titles work without it. Publish the new **About page → Shannequin full-body photograph** to supply both the homepage introduction and `/about#shannequin`. No mannequin photo was available locally; development clearly identifies the placeholder, while production shows a neutral awaiting-photo state. No data migration or publishing is performed automatically.

### Revised editorial defaults

`DESIGN.md` governs the current public design; `legacy/` is historical reference. `app/globals.css` centralizes the semantic colors and Tailwind aliases. The homepage keeps Sanity overrides for its hero, About copy/image and request banner, and Latest Verdicts remains the latest three published reviews. Its warm-cream Coming soon state appears only when there are no reviews. Archive search, product actions, filters, browser wishlist, dialogs and real provider submission behavior are preserved. No photography from the mockup has been copied or generated. Publish authorized main/detail hero photographs, an About teaser and a clothing-rack banner through the existing homepage fields, or add authorized photographs to the hero pool. Development placeholders remain labeled and production-disabled where configured.

### Vinted and Poshmark closets

Choose **Closet marketplace** per shopping item in Studio; existing items remain Vinted by default. Configure both profile URLs in Site settings. Cards, item details and wishlist use associated shop links in place of closet asking prices; prices remain available to administrative inventory/pricing tools. Poshmark purchase actions and URL validation are marketplace-specific. Existing `/shop` and `/shop/closet` routes remain intact under “My Closet”.

Poshmark importing uses its authorized Inventory Report export, not scraping. Run `npm run import:poshmark:convert -- --file inventory.csv --mapping columns.json --checked-at <report-ISO-time> --dry-run`, then convert to JSON and use `npm run import:products -- products.json --dry-run`. See [docs/IMPORTING.md](docs/IMPORTING.md) for exact steps, mapping, duplicate handling and field ownership. No additional provider credentials or passwords are needed for conversion.

Inventory rows include **Delete item** with an explicit confirmation. It removes the item's published document and draft together using the signed-in Studio user's permissions and revision checks. Other documents and image assets are retained; strong references may block deletion until resolved in the editor. Deletion does not remove marketplace listings. For sold items, prefer **Mark sold** if you want to retain the inventory record. No live data is deleted during feature verification.

### Master inventory imports from Studio

Open `/studio/inventory` and choose **Import master inventory CSV**. The format has nine required columns: **SKU, STATUS, NAME, DESCRIPTION, BRAND, SIZE, IMAGES, POSHMARK, VINTED**, plus an optional **URL** column for the individual Vinted/Poshmark item listing. One SKU represents one item across both stores; the marketplace columns are separate asking prices. Blank optional cells keep existing data. Preview matches and confirm to save product drafts, then review and publish. New shared brand labels are created after confirmation. No product is published automatically.

For multiple photos, enter `SH-001-front.jpg | SH-001-back.jpg` in one IMAGES cell and click Preview to reuse existing uploads, then select only the missing files listed by the dialog. A blank cell keeps existing photos. A filled URL sets Purchase link, its marketplace-specific listing link, and the primary marketplace. Blank or omitted URL cells keep existing links; reviews remain intact. Use this master sheet for routine imports instead of separate Poshmark exports. See [the master CSV guide](docs/IMPORTING.md#master-inventory-csv-in-studio-current-workflow) and [example file](docs/master-inventory.example.csv).

### Publishing closet inventory

In **Studio → Inventory**, draft rows have a **Publish** action; published rows have **Set to Draft**. Both ask you to confirm the selected item. Publish validates the complete current draft against the product schema (including custom validations) and publishes all draft edits. Fix any validation errors through **Edit** first. Set to Draft uses Sanity's native unpublish action, retaining editable content and leaving marketplace listings unchanged. Existing references and your Studio publish/unpublish permissions are enforced; failures leave the action available for correction/retry. Inventory refreshes after success. Public pages follow the existing five-minute content cache.

Local example review: with `ENABLE_DEMO_CONTENT=true`, open `/reviews/example-jeans-review` to preview a complete written jeans review, including editorial card, gallery, fit notes, byline and Portable Text article sections. When configured Sanity has no reviews, this example also fills the homepage/archive. It is visibly labeled as fictional, uses existing illustrative sample photos, has no purchase links, is noindex, and is excluded from the sitemap and all production routes. Real Sanity reviews take precedence in listings; the direct local example URL remains available while the demo flag is enabled. Nothing is seeded or written to Sanity.

### Editorial review layout

Reviews now use a dedicated two-column editorial page, separate from blog posts. In **Studio → Content → Review**:

- Keep **Title** as the complete headline. **Script phrase in the review headline** can be an exact ending phrase, such as `Questionable pockets.`; leave it blank for an all-serif title. Category, date and size worn use the existing fields.
- Expand **Numbered review sections**. Each of the four fixed slots has an editable **Section heading** and Portable Text **Section copy**. Defaults: First Impression; Fit / Comfort; Who might like this?; Final Take. Numbers are automatic. Fill all four copies when using the structured layout. There is no unrestricted page builder.
- Add a **Featured image**, **Additional try-on photos**, and optional thumbnail captions. Add an authorized HTTPS MP4/WebM **Video URL** for video or mixed media. **Review format** controls the initial media preference; “Written and video” starts on the image. The overlay/thumbnail switches to the video without autoplay. Provide captions/transcript where available. All media remains accessible with JavaScript disabled.
- Add **Shannequin says…** to show the quote panel. Its image is always taken from **Homepage → Shannequin full-body photograph**, so changing that one image updates all review quote panels. It preserves the full original image without the decorative “18.” No quote means no quote panel. Missing shared imagery displays an honest placeholder; upload/publish a transparent full-body cutout in Homepage to complete it.
- Optionally select **Bottom CTA — shopping item or curated find** and a custom button label. The link opens the selected published item’s detail page, where existing retailer/closet actions and sold states apply. Unpublished/missing targets do not produce broken CTAs. This reference is a selected promotion, separate from the product’s existing related-review relationship.

Existing review body, fit notes, images, videos and associations are retained. Reviews without structured sections render their existing article copy in the editorial layout. Additional/legacy article copy is also rendered below populated sections if retained, so clear it manually only when intentionally replacing its text. No content migration or Sanity writes were performed. Blog post layouts are unchanged. The local example at `/reviews/example-jeans-review` demonstrates the new sections and quote panel; it stays demo-only and noindex.
