# Phase 2B status

This is a **local code change**. It has not been deployed, and no live Sanity document or asset has been deleted.

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

Legacy product, inventory, and wishlist tools are detached from Studio navigation. The legacy pricing API route and importer npm command were removed. Their source modules and product schema remain in the repository temporarily so existing production records can still be inspected and the data cleanup can be reviewed. Public pages no longer call `getDocuments('product')`.

The read-only [deletion dry run](PHASE-2B-DELETION-DRY-RUN.md) found **22 `product` documents** in the `production` dataset: 10 published/other and 12 drafts. It found no incoming strong or weak references from other documents and no image or file assets shared between target products and other documents. No assets are proposed for deletion. Re-run the audit immediately before any deletion because the dataset may change.

A full Sanity export, including drafts and 36 assets, is stored locally at `imports/phase2b-production-2026-10-28.tar.gz` (gitignored, 38 MB). SHA-256: `f92208082af9927df44b18b281adb8a135672a84949b8c3f315697994ba22927`. The archive listing and checksum were verified. Recovery should use Sanity's dataset import procedure into a separate dataset first; do not overwrite production without a reviewed recovery plan. Copy this backup to durable private storage before live deletion; local `imports/` alone is not a durable backup.

Live deletion is pending. The owner identified Vercel as the host and `https://www.curvygirlreviews.com` as the production URL. A live check on 2026-10-29 found that both `/` and `/shop` return HTTP 302 redirects to `curvygirlreviews-com.l.ink`; the destination identifies itself as a PHP link service, so the replacement Next.js frontend is not verified at that URL. `SITE_URL` is unset locally. Do not delete the 22 documents until the replacement frontend is deployed and verified at its actual public URL, the backup is stored durably, the dry run is refreshed, and the exact targets are approved.

## Validation and release notes

The local production build, TypeScript check, lint, and 102 unit tests passed. Focused Playwright checks passed for desktop/mobile Shop and Closet, Look opening and saving, affiliate link attributes, redirects, legacy saved-ID cleanup, reflow, and automated WCAG 2.1 AA rules. Manual screen-reader and editorial-image review still needs to happen before release.

`SITE_URL` must be set to the HTTPS origin that actually serves this Next.js deployment before launch. Without it, the generated sitemap is empty and social metadata falls back to localhost. There is no Phase 3 image-generation implementation in this change.
