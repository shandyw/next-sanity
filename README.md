# CurvyGirlReviews

Next.js 16, React, TypeScript, and Sanity Studio. The Phase 2B site is deployed to Vercel; this branch contains local legacy inventory code cleanup for review. The verified Sanity backup is preserved in `imports/`. See [Phase 2B status](docs/PHASE-2B.md) and the [deletion execution record](docs/PHASE-2B-FINAL-DELETION-VERIFICATION.md).

## Current content model

- **Reviews** are editorial articles and may optionally link to a primary Amazon Find.
- **Finds** hold reusable Amazon links, ASINs, categories, and experience status. They have no standalone public detail route.
- **Looks** are editorial collections of Finds, shown at `/shop` and `/looks/[slug]`.
- **My Closet** links to the external Vinted shop configured in Site Settings. Resale inventory is managed on Vinted.
- **Saved Items** stores Reviews and Looks in the visitor's browser. Obsolete saved product IDs can be removed there.
- **Support the Reviews** retains the external Amazon gift wishlist and Request a Review form.

The retired `product` schema, inventory dashboard, pricing assistant, and product importers are no longer part of this application. See [content entry guidance](docs/IMPORTING.md).

## Local development

Use Node 24 LTS (minimum 22.12). Copy `.env.example` to `.env.local` and configure the Sanity project and dataset. Never commit credentials.

```sh
nvm use
npm ci
npm run dev
```

Open `http://localhost:3000` for the site and `/studio` for content editing. Published content reads from the configured public Sanity dataset. Studio editing uses the logged-in editor's Sanity permissions. Draft preview uses the server-only `SANITY_API_READ_TOKEN` and configured Sanity CORS origins. Set `SITE_URL` to the deployed HTTPS origin for canonical URLs and sitemap entries.

Run checks before review:

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

Browser checks use Playwright and a running local server (`npm run test:browser`). External form delivery requires the configured review-request provider; newsletter signup uses the configured MailerLite or endpoint integration. Without a provider, forms report that nothing was submitted. Keep their tokens server-only. See `.env.example` for configuration names.

## Routes and publishing

Core routes are `/`, `/reviews`, `/reviews/[slug]`, `/shop`, `/shop/closet`, `/looks/[slug]`, `/about`, and `/support`. Blog, Saved Items, privacy, disclosures, and thank-you routes remain available. `/shop/finds` redirects to `/shop`; `/my-wishlist` redirects to `/support`. Retired product detail URLs intentionally return 404 unless a current route matches.

Publish owned images and editorial content in Studio. The public site uses published Sanity content with time-based cache revalidation; draft preview requires editor authorization. The old inventory import workflow is retired. The verified backup is for recovery and historical pricing retention, not routine importing.
