# Phase 2B status

The Phase 2B website is deployed to Vercel production and was manually verified by the owner. The authorized legacy-product deletion completed on 2026-11-01; no Sanity assets were deleted. The legacy source-code cleanup is implemented locally on the Preview branch and has not been deployed.

## Public experience

- `/shop` is the Shop the Looks archive, with occasion links and editorial Look cards.
- `/looks/[slug]` displays an approved editorial image, introduction, optional keyboard-accessible hotspots, an accessible Find list, Amazon links from the referenced Finds, disclosure, and related Looks.
- Reviews may show an Amazon CTA from their optional primary Find. Review copy, fit details, media, SEO, and URLs remain in place.
- `/shop/closet` links to the Vinted storefront in Site Settings. There is no local resale grid.
- `/support` retains the external Amazon gift wishlist and Request a Review. `/my-wishlist` redirects there; `/shop/finds` redirects to `/shop`; old `/shop/[slug]` product URLs return 404 because a matching Look cannot be inferred safely.
- Visitor Saved Items now supports Reviews and Looks. Old product IDs can be cleared from the browser list.
- The homepage retains the curtain hero and adds Shop the Looks, category, Vinted, and Support sections.

Finds have no public detail route. Product title, category, and an Amazon product or affiliate URL are the essential editor inputs; the internal slug is optional. ASIN parsing remains automatic for full supported URLs and manually editable. The separate Find Brand field remains removed. Experience status is Not Tested, Received, or Tested.

## Legacy code and data

The legacy `product` schema, inventory and wishlist tools, pricing assistant, importers, and product-only frontend modules have been removed locally. The pricing API route and importer npm command were removed earlier. Shared Amazon, acknowledgement, review, and Saved Items behavior remains in the active code. Public pages do not call `getDocuments('product')`.

The read-only [deletion dry run](PHASE-2B-DELETION-DRY-RUN.md) found **22 `product` documents** in the `production` dataset: 10 published/other and 12 drafts. It found no incoming strong or weak references from other documents and no image or file assets shared between target products and other documents. The immediately preceding preflight confirmed the same target set. One atomic transaction deleted exactly those 22 approved documents. Post-deletion verification found **0 products**, **72 remaining documents**, unchanged revisions for every non-target document, and all **36 image assets** intact. See the [execution record](PHASE-2B-FINAL-DELETION-VERIFICATION.md).

A full Sanity export, including drafts and 36 assets, is stored locally at `imports/phase2b-production-2026-10-28.tar.gz` (gitignored, 38 MB). SHA-256: `f92208082af9927df44b18b281adb8a135672a84949b8c3f315697994ba22927`. The archive listing and checksum were verified. The owner confirmed a private offsite copy; it was not independently accessed during the audit. Historical listing and reference prices remain in that backup. Recovery should first import into a separate dataset; restoring to production requires separate review and authorization.

After deletion, `/`, `/shop`, `/shop/closet`, `/support`, and `/reviews` each returned HTTP 200 at `https://curvygirlreviews.com`. These are route smoke checks; they do not replace a full manual review. The earlier deployment blocker is resolved.

## Validation and release notes

For the deployed Phase 2B overhaul, the earlier local production build, TypeScript check, lint, and 102 unit tests passed. The subsequent local legacy-code cleanup passed TypeScript, lint (one unrelated unused-import warning in `RequestBanner.tsx`), 32 remaining unit tests, a complete production build, and focused Playwright checks for Shop, Closet, Looks, Saved Items, Support redirects, Review filters, and active editorial heroes. Manual screen-reader and editorial-image review still needs to happen before the next release.

Keep `SITE_URL` set to the HTTPS origin that serves this Next.js deployment. There is no Phase 3 image-generation implementation in this change.
