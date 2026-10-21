# Authorized product imports

No scraper, private Vinted API, or server-side image downloader is implemented. Frontend components read normalized Sanity product documents regardless of their source. Manual products work independently.

Use JSON with `version: 1`, a stable lowercase `source` key identifying your authorized supplier, and `products`. See `products.example.json` (illustrative only; replace every sample value). Each record requires:

| Field                      | Rules                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| externalListingId          | Stable supplier ID, 1–100 letters/digits/underscores/hyphens                      |
| title                      | 1–160 characters                                                                  |
| listingPrice               | Finite number >= 0                                                                |
| currency                   | USD, GBP, EUR, CAD, AUD, PLN, CZK, SEK, DKK                                       |
| availability               | available, reserved, sold, unknown                                                |
| vintedUrl (Vinted records) | HTTPS allowlisted Vinted domain, `/items/<numeric-id>` path; tracking is stripped |
| lastSuccessfullyCheckedAt  | ISO timestamp including timezone; no future timestamps                            |

Optional fields: description (5000 chars), size (60 chars), condition (one of the Studio choices), `photoAssetRefs: [{"assetRef":"image-<hash>-<width>x<height>-jpg","alt":"Description"}]`. Upload owned/authorized photos through Studio first and reference their Sanity asset IDs. Connected runs verify the assets exist. Raw external image URLs, arbitrary fields, HTML payloads, and review bodies are rejected. Nothing fetches a URL from an import file.

```sh
npm run import:products -- docs/products.example.json --dry-run
npm run import:products -- /absolute/path/authorized-products.json --dry-run
npm run import:products -- /absolute/path/authorized-products.json
```

Create `.env.local` first. Dry runs without project configuration perform offline validation and report proposed creates; they explicitly cannot check remote matching or asset existence. With configuration they read existing records but never mutate. Live runs require a server-only Editor token (`SANITY_API_WRITE_TOKEN`). Never put it in `NEXT_PUBLIC_*`, source code, or browser code.

Identity is the SHA-256 hash of `source + NUL + externalListingId`. Matching also queries the composite identity so preexisting documents are respected. A duplicated identity or an outstanding draft skips the record for editorial resolution. Repeated IDs within a file skip later duplicates. Creating uses a strict transaction create, so concurrent collisions fail rather than silently overwrite. Updating requires the fetched revision, so concurrent editorial edits cannot be overwritten.

On creation the importer initializes title, slug, description, size, condition, asset references, source, and listing fields. On subsequent runs it owns **only** listingPrice, currency, availability (only when no explicit editorial Sale Status is assigned), vintedUrl, and lastSuccessfullyCheckedAt. SKU and Sale Status are always editorial: the strict JSON format rejects these fields, and updates never patch them. Once Sale Status is assigned, imports preserve the synchronized availability too. It cannot overwrite title, description, slug, photos, crop/hotspot, brand, categories, size, condition, review links, or editorial content. Switch off “Allow listing updates from imports” to protect all fields. To change editorial fields use Studio. Manual-source records cannot be updated by the importer.

Unchanged or older check timestamps skip updates, making reruns safe. An absent item is never changed or sold. Failed validation/network requests leave prior content intact. The summary reports created, updated, skipped, failed; dry-run counts indicate planned actions, not writes. Any failed record gives a nonzero process exit. Partial successes remain saved; fix failures and rerun safely. Availability older than seven days or without a successful check is visibly identified as not recently verified. Sold products remain related to their reviews and never get a purchase action.

The feed producer is responsible for authorization, truthful prices/availability, and actual check timestamps. The importer does not claim to check Vinted itself. A future authorized supplier adapter should emit this format rather than changing frontend components.

## Vinted closet listings

In Studio, choose **Physical closet inventory** for a closet product. Set **Site settings → Vinted shop URL** to your profile URL and use the product's **Purchase link** or **External Vinted listing** for the individual item. Closet cards and saved items link to the configured Vinted profile; item purchase buttons link to valid Vinted item URLs. Prices stay available to the administrative inventory and pricing tools. This site does not synchronize Vinted listings.

## Master inventory CSV in Studio (current workflow)

Open **Studio → Inventory → Import master inventory CSV**. Required columns are `SKU, STATUS, NAME, DESCRIPTION, BRAND, SIZE, IMAGES, VINTED`. Optional columns are `URL, CATEGORY, CONDITION`. See [the example CSV](master-inventory.example.csv). One SKU represents one physical item. The VINTED column contains its asking price, not a URL. A blank price preserves the saved price. URL accepts an individual HTTPS Vinted `/items/` link; it updates Purchase link and External Vinted listing. A blank URL preserves existing links. Shop/profile URLs and other hosts are rejected, and tracking parameters are stripped. Choose the file currency explicitly in the import dialog.

The preview matches SKUs, checks image filenames and shows what will change. Confirming creates or updates drafts only; review each draft and publish it in Studio. Missing CSV rows never delete or mark products sold.

### Multiple photos in a cell

A CSV holds text, not embedded images. In the spreadsheet, type filenames in one IMAGES cell:

```text
SH-001-front.jpg | SH-001-back.jpg | SH-001-label.jpg
```

Then export CSV, upload it in Studio, and click **Preview master import**. It looks for existing Sanity image assets and lists only filenames that still need files. Select those missing files together in **Photo files**, then preview again. Filenames must match exactly and be unique. Supported filename formats are JPEG/JPG, PNG, WebP, HEIC/HEIF and AVIF; Sanity must support decoding the actual file. Maximum 20 photos per item and 20 MB per photo. Existing assets are reused by filename, preferring the matched item's own recorded image/filename associations. Older uploads can be matched by Sanity's original filename. If several different assets share a filename and the correct one is not established, select the intended local file explicitly; the importer does not guess. New uploads remember filename aliases so later imports also work when Sanity deduplicates identical content uploaded under different names. Use unique SKU-prefixed filenames where possible.

Files are uploaded using your authenticated Studio client **only after confirmation**, and only if selected rows reference them. A deliberately selected local file takes precedence over a saved filename match, allowing replacement. Existing crop, hotspot and edited alt text are kept when reusing the same asset. There is no arbitrary URL fetching. Identical assets are deduplicated by Sanity; existing crop, hotspot and alt text are retained when that asset is kept. New photos receive a title-based description to refine in Studio. Review the 4:5 crop and image descriptions before publishing.

### Review, matching and safe reruns

1. Upload the master CSV (up to 10 MB / 10,000 items), choose currency, and select any referenced photo files.
2. Click **Preview master import**. File validation and preview do not write or upload anything. Duplicate CSV SKUs, invalid statuses, bad prices, unresolved image filenames, and duplicate/unpublished brand labels need fixing first.
3. Review every preview page. Exact SKUs/master identities match existing items, deduplicating draft/published pairs in favor of drafts. Older imported items with matching external IDs are suggestions: select **Match** explicitly to adopt the master SKU while retaining their document IDs, links, images and review relationships. Never choose Create new when a row refers to an existing physical item. Duplicate stored SKUs and excluded/disabled items default to Skip and cannot be overwritten.
4. Confirm the checkbox and **Confirm master import**. Filled master fields become authoritative for the selected items. Item changes are draft-only; new shared brand labels are created directly after confirmation so references resolve. No product is automatically published.
5. Review item drafts in Content or Inventory, add any missing listing links and required fields, refine photo descriptions/crops, then publish. The existing schema validation still applies. Confirm the Vinted listing link in the product editor if needed.

Existing slugs, reviews, categories, condition, fit notes, and unrelated fields are kept. A filled URL updates External Vinted listing and Purchase link. A blank/omitted URL keeps all existing links. Blank optional cells **do not clear content**. To clear a field deliberately, use Studio. The preview shows reused assets and any missing/ambiguous filenames. Only rows selected for import require images; skipped rows do not. A nonempty IMAGES list adds selected photos while preserving existing editorial gallery images, alt text and crops. Remove/reorder images explicitly in Studio. A blank IMAGES cell preserves photos and crops.

Inventory uses the Vinted asking price, not sales revenue. Master imports do not claim that a live marketplace listing was checked, so they do not refresh `lastSuccessfullyCheckedAt`.

New product IDs derive from the stable, case-normalized master SKU. Existing document IDs and legacy import metadata remain intact when matching. The importer adds a read-only master identity to retain the association across publishing. Revision checks reject edits made since preview. Reruns update existing items or skip unchanged fields; they do not create duplicates. Records absent from a file are never sold, deleted or otherwise modified.

Imports respect your Studio account's permissions and import-disabled items. The results report created/updated/skipped/failed counts; partial successes stay saved, and failures retain original item content. Newly uploaded assets or shared brand labels can remain after a later item save fails; the importer does not delete shared data as rollback. Preview again before retrying. Manual edits work independently. No write token, extra API integration or bulk migration is required.

The upload implementation follows Sanity's [browser asset upload documentation](https://www.sanity.io/docs/apis-and-sdks/js-client-assets).

Category, Brand, Size and Condition filter options come from all products in the selected shopping section, before filtering or pagination. New category/brand labels are reused across imports, and Condition is stored directly on the product. Import and publish the item in Studio to make its new values appear publicly (allow the normal five-minute content cache to refresh). Category and Condition columns are optional so older master files remain compatible. Duplicate or draft-only category/brand labels must be resolved before import. Products stay drafts until explicitly published; creating a taxonomy label does not publish the product.

Current field ownership and rollback instructions: [Catalog operations](CATALOG.md). Source-field overrides take precedence over filled CSV cells.
