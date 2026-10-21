# My review wishlist (Curated Finds)

`/my-wishlist` is a noindex subset of published Shopping items in **Curated Finds** with **Include in My review wishlist** enabled and quantity received below quantity wanted. `/wishlist` remains a visitor’s browser-saved items. Shared cards, photo carousels, filters and local `/shop/[slug]` detail pages are reused. Support offers the configured external Amazon wishlist and embeds existing catalog wishes; Request a Review links to its review-wishlist section. Gift-request Amazon links remain ordinary links.

## CSV import

Open `/studio/review-wishlist`, choose the Amazon CSV, review the preview and select **Import drafts**. The attached 10-row export validates. No live content is imported automatically by the code change.

Supported columns: `Name, Price, Rating, Product URL, Image URL, Date Added, Priority, Needs, Has, Comment`. Quoted commas/multiline cells and BOM work. ASINs match draft/published pairs once. Re-imports preserve editorial title, slug, photos, quantities, notes, affiliate configuration and wishlist decisions. Duplicate matches, closet matches and changed revisions are rejected. Missing CSV rows never delete or mark items received.

New products are Curated Finds with needs-review defaults and an indexing intent that takes effect only after editorial checks pass and no personal-test or affiliate assertion. Price remains an admin reference value; Rating is not published. Neither becomes a public price or rating. The CSV comment is not shown on the site; write original commentary separately. Existing legacy snapshots may remain on records that have not been re-imported, even though the field is hidden from Studio. Those values are not automatically private in a public Sanity dataset.

Use **Edit** to supply an original title, Why I picked it, limitations, seller facts attributed separately, actual experience, original/licensed photos with source information, related guides and an editorial date. The **Amazon content audit** section lists outstanding issues across Amazon products, including those not on the wishlist. Editorial approval and the required content checks control whether an Amazon page with the default indexing intent becomes indexable; see [the launch handoff](AMAZON-LAUNCH.md).

**Publish** validates/publishes the complete current draft. **Set to Draft** unpublishes while retaining editable content. **Delete item** confirms and deletes both versions of the shared Curated Find; Amazon is unchanged. **Mark received / Mark wanted** saves quantity changes to drafts; publish to update the public wishlist. Fully received products remain in Curated Finds. Public content can take five minutes to refresh.

No scraping, live Amazon sync, price/stock display, rating republication or Amazon image caching is added. A later licensed API integration requires a separate policy and access review; activating an Associate tag alone does not enable one.

See [Catalog operations](CATALOG.md) for current placements, consent, public-dataset exposure, and migration safeguards. No external wishlist URL is invented. Individual gifts require catalog records to support visitor saves.
