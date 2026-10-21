# Catalog operations and migration

The existing `product` type remains the catalog. Permanent identity is the Sanity document ID (drafts share their published ID); IDs, slugs, saved-item IDs and review references are preserved. Do not recreate an existing item to change its placement.

## Terminology and routes

```text
Home / (logo)
├── Reviews /reviews → /reviews/[slug]
├── Shop /shop
│   ├── My Closet /shop/closet
│   ├── Curated Finds /shop/finds
│   └── Item /shop/[slug] → labeled external shopping actions
├── About /about → Meet Shannequin
├── Support the Reviews /support
│   ├── Suggest something → Request a Review popup
│   └── Send something → configured Amazon wishlist + existing catalog wishes
└── Saved Items /wishlist
Footer → Contact popup, privacy, disclosures
Preserved: /my-wishlist (My Review Wishlist), /my-faves, legacy redirects
```

Saved Items retains `curvygirlreviews:wishlist:v1` and existing product IDs. Nothing needs migrating in visitor browsers. Missing/deleted saved IDs are retained until a visitor removes them; archived and sold records remain readable. Saves do not reserve or buy items.

## Relationships and independent states

- `catalogSource`: physical closet unit or Amazon product. Each separately owned unit gets its own SKU/record; cross-listing a unit keeps one record and both marketplace URLs.
- `displayPlacements`: closet sources support `closet`; Amazon supports `finds` and `reviewWishlist` simultaneously. An explicit empty array hides collection membership. Legacy `shoppingSection`/`onReviewWishlist` are fallbacks only when placements are unset.
- Publication uses Sanity drafts/published versions; `archived` independently removes collection visibility and shopping actions while retaining detail/review/saved references.
- Closet `saleStatus`/legacy availability are separate from Amazon `reviewProgress` (not requested, wanted, received, in progress, reviewed). A sold legacy flag conservatively takes precedence.
- `underlyingProduct` connects a separately owned closet garment to its Amazon catalog counterpart. `relatedProducts` provides searchable product references and rejects cycles. `productCollection` owns one ordered membership list for an outfit/collection.
- Review `reviewedProducts` references catalog records; legacy product-side review links still work. Reader-provided acknowledgments appear below the H1. Sender name and custom text require name permission; otherwise a fixed anonymous thank-you is used. Do not enter private contacts in public fields.

## Editing

Open Studio → Products. Filter All Products, My Closet, Curated Finds, My Review Wishlist, Needs Attention, or Archived; search name/SKU/ASIN/brand. Use Add product or Edit product / marketplace links. Needs Attention identifies incomplete information and recorded import conflicts. Public-image approval rules apply to Amazon imagery.

Mark sold/available, archive/restore and review-progress actions save drafts. Review and publish in the editor to apply publicly (allow the five-minute content cache). A sold unit leaves the default shop grid and loses purchase actions. Update the Vinted listing yourself: this site does not synchronize it. Pricing tools retain its asking price.

Archive is the normal removal action. The editor’s permanent deletion checks references, including drafts, then uses Sanity’s native deletion enforcement. Existing inventory/Amazon tools also check references and revision guards before deletion. Resolve references deliberately; browser-local saves cannot be enumerated by Studio. Deleted items show unavailable in Saved Items.

## Import ownership

See [CSV formats and preview steps](IMPORTING.md) and [Amazon columns](REVIEW-WISHLIST.md). Repository samples include `master-inventory.example.csv` and `products.example.json`. No new CSV format is required.

CSV controls supplied source facts: brand, category, size, condition, listing URLs, availability and marketplace prices, subject to the importer’s existing status protections. Studio controls editorial descriptions, custom photos, placements, archive state, review progress and relationships. Imported descriptions seed new closet records only. A name follows imports only when it still equals its previously imported name; legacy/manual names are preserved. New Studio products receive default source-field protections in the hidden `importOverrides` field; existing products keep their saved protections. Availability and sale-status overrides protect both representations; purchase-link override protects listing links. Slugs and IDs never change on re-import.

Master photo imports append authorized selected photos without removing editorial images; retained crop, alt and filename aliases survive. Blank optional cells keep existing values. To clear values or remove/reorder photos, edit in Studio. Missing rows do nothing. New products are drafts. Preview rejects duplicate identifiers and malformed URLs; exact stable identities match automatically, names only suggest an explicit legacy match. Review every preview and row-level result. After a partial failure, preview again and retry failed rows: prior successes retain their stable identities. Taxonomy labels/uploads can remain after a failed product write; do not delete shared assets as rollback.

Amazon ASIN identifies a variant; use the actual variant ASIN. Imports preserve existing placements, editorial work, quantities and review decisions. Source snapshots/reference prices/images are admin references, never public offers or automatically approved galleries.

## Review wishlist configuration

Support defaults to an external Amazon wishlist set in Site settings → My Review Wishlist URL. No URL is invented. Without configuration the gift action shows an unavailable message; Request a Review still opens the existing popup. Product shopping and wishlist gifting use separate destinations.

The existing optional `/my-wishlist` route/import tool is preserved. To enable catalog entries, add `reviewWishlist` placement to an Amazon record, set wanted progress and desired size/color, provide approved public imagery, and publish. Existing records may also stay in Curated Finds. Received/in-progress/reviewed items leave the wishlist. Support shows those same records with save actions. Individual external Amazon wishlist entries can only be saved to Saved Items when matching site catalog records exist; the lower-maintenance external list alone cannot provide individual saves.

## Public data and remaining exposure

Explicit GROQ projections exclude admin snapshots, reference prices/images, import details and unapproved Amazon images, including nested review/product references. Amazon reference prices do not become metadata or structured-data offers. Unreviewed finds do not become structured-data reviews. Tests evaluate the real projection against fixture documents.

The app’s documented content dataset is **public**, with no read token for published content. Excluding fields from frontend queries or hiding fields in Studio does not make published Sanity documents private. Published reference snapshots and asset URLs may remain readable through Sanity APIs/CDN. Do not store confidential sender details there. No live dataset ACL/asset audit or production content inspection has been performed in this task. Truly private reference storage needs a separate private dataset/server-only authorization and an explicit content/asset migration; changing the current dataset to private alone would break public reads.

## Migration, backup and rollback

The migration is optional: compatibility fallbacks work before it. It adds source, placements, archive default and Amazon review progress only where missing. It never changes document IDs, slugs, prices, availability, images or references.

1. Export the actual Sanity content dataset and assets using your authenticated Sanity CLI; retain an untouched dated backup outside the repository. Record project, dataset and ACL settings. Inventory draft/published/release records, IDs, SKUs, ASINs, references and existing editor overrides from that export before approving writes. No live inventory is claimed here.
2. Extract the export’s `data.ndjson` locally. Run `node --import tsx scripts/prepare-catalog-migration.ts --input /path/data.ndjson --output /path/catalog-plan.json` with Node 24. This is an offline dry run; an existing output file is never overwritten.
3. Inspect every planned `setIfMissing` and `ifRevisionID`. Test against a disposable restored dataset first. Applying to production requires separate approval and authenticated tooling; no production apply command runs automatically.
4. If applying, require the exported revision for every patch and `setIfMissing` semantics. Stale documents require a fresh export/plan. Keep the applied plan and new revisions.
5. Roll back only keys in each applied plan’s `rollbackUnset`, checking applied revisions and intervening editorial changes first. Never unset a field subsequently edited by an editor. For broader recovery, restore the backup to a separate dataset and compare before any approved production restore. Uploaded/shared assets must not be blindly deleted.

External setup remains: real wishlist URL, marketplace listing/profile URLs, approved images and editorial publication; Sanity authentication/content audit and approved migration; review-request delivery adapter and newsletter settings where not configured. No deployment or production writes are part of this work.

Affiliate disclosure behavior was checked against Amazon’s official [disclosure guidance](https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98) and [Operating Agreement](https://affiliate-program.amazon.com/help/operating/agreement/) on October 19, 2026. Existing Associate identification and nearby commission disclosures are retained; affiliate activation does not authorize imported Amazon imagery or price publication.
