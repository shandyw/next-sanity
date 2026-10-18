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

## Poshmark closets and authorized exports

In Studio, select **Shopping item → Shopping section: My Closet → Closet marketplace: Vinted or Poshmark**. Missing marketplace fields mean Vinted for compatibility. Use the **Purchase link** for a manual listing, or the marketplace-specific external listing field for imported data. Set **Site settings → Vinted shop URL / Poshmark closet URL** to your actual profile URLs. Closet prices on product cards, detail pages and wishlist rows are replaced by those shop links; prices remain in Studio for inventory/pricing and price sorting. Price range filtering is no longer offered; old min_price/max_price parameters are ignored. Curated Finds retain their retailer behavior.

Poshmark's [current terms](https://www.poshmark.com/terms) prohibit automated scraping. Use its official [Inventory Report CSV](https://support.poshmark.com/s/article/How-to-download-My-Inventory-Report?language=en_US): **Account → Seller Tools → My Inventory Report**, then download the emailed report. The report contains available listings only. Missing rows are never treated as sold. No scraper, private API, account-password collection, or page-request scraping is implemented.

The local converter accepts the report with an explicit column mapping because report headers can vary. Copy `docs/poshmark-columns.example.json` to a local mapping file and replace every placeholder with the exact CSV header. Use the column containing the **current asking price**, not acquisition cost or original retail price. Keep `source` stable and unique to this closet (prefix `poshmark-`). Set `currency` to USD or CAD and `region` to com or ca to match your closet. Optional mappings are `listingUrl`, `description`, and `size`. Unmapped report fields such as internal costs/SKUs are ignored and do not reach public content.

If no `listingUrl` column is supplied, the converter requires the actual 24-character Poshmark listing ID and constructs its public listing URL. Verify the generated link in a browser before importing; the converter does not visit or validate live availability. Provide the report's actual generation/inspection time through `--checked-at`, not an invented fresh timestamp for an old report. Upload owned photographs manually in Studio; no third-party image URLs are fetched.

```sh
# Replace paths and timestamp with your real export, mapping, and report time.
npm run import:poshmark:convert -- --file /absolute/path/inventory.csv --mapping /absolute/path/columns.json --checked-at 2026-10-14T12:00:00Z --dry-run
npm run import:poshmark:convert -- --file /absolute/path/inventory.csv --mapping /absolute/path/columns.json --checked-at 2026-10-14T12:00:00Z --out /tmp/poshmark-products.json
npm run import:products -- /tmp/poshmark-products.json --dry-run
npm run import:products -- /tmp/poshmark-products.json
```

Conversion is offline and needs no credentials. It validates every row, reports converted/skipped/failed counts and refuses to write any output if rows fail. Existing output files are not overwritten. The final importer reports created/updated/skipped/failed and uses server-only credentials for writes. Safe reruns retain the existing source/listing-ID matching, draft protection and revision checks.

The normalized JSON format is still version 1. Poshmark records use `closetPlatform: "poshmark"` and `poshmarkUrl` instead of `vintedUrl`. Vinted records may omit `closetPlatform` or set it to `"vinted"`; existing feeds remain compatible. A record cannot combine both marketplace URL fields. On creation the marketplace is initialized. Subsequent imports never change an editor-assigned marketplace, SKU, Sale Status, manual Purchase link, photographs, categories, size or reviews; a marketplace mismatch is skipped. Imported listing updates use the marketplace-specific URL, price, currency and check timestamp, plus availability only when no editorial sale status exists. Manual editing works without imports.

### Reports with introductory rows and seller SKUs

Some official Inventory Activity Reports include a title, report date and notes before the table. Set `headerRow` to the one-based CSV record containing the actual column headings (7 in the supplied @cgrshop report). Default is 1 for ordinary CSV files. Empty data rows are ignored.

If the report has **Listing SKU** but no listing ID or URL, use that stable seller SKU as `externalListingId` and add the actual public URL separately through the mapping's `listingUrls` object, e.g. `"listingUrls": {"YOUR-SKU": "YOUR-ACTUAL-POSHMARK-LISTING-URL"}`. Each URL is validated. Seller SKUs are never copied into the manually curated Studio SKU field, and no Poshmark URL is invented from a SKU. Use `Current Listing Price`, not Cost Price or Lowest Listed Price.

Keep account exports and completed mappings in the Git-ignored `imports/` folder. Conversion reports missing URLs as failed rows and emits no output until all records validate. If you change the stable ID mapping for a source already imported, resolve the old identities first to avoid duplicate records.

## Master inventory CSV in Studio (current workflow)

Studio now uses your **CGR Inventory** master sheet for both marketplaces. Open **Studio → Inventory → Import master inventory CSV**. Marketplace-specific exports and the CLI described above are legacy/advanced workflows; do not mix them with the master sheet for routine updates.

Use these nine required column names plus optional URL, CATEGORY and CONDITION columns (case-insensitive; column order may vary):

```csv
SKU,STATUS,NAME,DESCRIPTION,BRAND,SIZE,IMAGES,POSHMARK,VINTED,URL,CATEGORY,CONDITION
```

| Column         | Meaning and behavior                                                                                                                                                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SKU            | Required text identifier, e.g. SH-001. Leading zeros stay intact. One physical item per row, including items sold on both stores. Matching ignores letter case. Keep SKUs stable across files.                                                                                                   |
| STATUS         | Required Available or Sold, case-insensitive. Sets both Sale Status and legacy availability consistently. An explicit Available row can reopen an item previously marked Sold: review this before confirming.                                                                                    |
| NAME           | Required product title. Replaces the title of a matched item; the existing slug/URL stays unchanged.                                                                                                                                                                                             |
| DESCRIPTION    | Product description, including quoted multiline copy. A filled cell replaces product description; blank keeps it. Review bodies are never changed.                                                                                                                                               |
| CATEGORY       | Optional clothing category name, e.g. Shoes or Dresses. Case-insensitive matching reuses existing published clothing categories; new labels are created after confirmation. A filled cell sets this item’s category; blank or omitted keeps existing categories. Use one category per cell.      |
| CONDITION      | Optional condition text, e.g. Excellent or New with tags. New values appear in the closet Condition filter automatically. Blank or omitted preserves the current condition.                                                                                                                      |
| BRAND          | Brand name, matched case-insensitively to existing published brand labels. Missing labels are created after confirmation. Duplicate or unpublished labels require editorial resolution. Blank keeps the current brand.                                                                           |
| SIZE           | Text such as 8.5M or 16–18. Blank keeps existing size.                                                                                                                                                                                                                                           |
| IMAGES         | Ordered image **filenames** separated by `                                                                                                                                                                                                                                                       | `, e.g. `SH-001-front.jpg | SH-001-back.jpg | SH-001-label.jpg`. Click Preview to find already uploaded images, then select only missing files in the Photo files picker. Do not paste URLs, folders or embedded spreadsheet images. Blank keeps the gallery; a filled cell replaces it with these files in this order. |
| POSHMARK       | Poshmark asking price, e.g. `$54`, `54.00` or a quoted `"$1,200.00"`. This is a price, not a URL. Blank preserves the stored Poshmark price.                                                                                                                                                     |
| VINTED         | Vinted asking price, using the same format. Blank preserves the stored Vinted price.                                                                                                                                                                                                             |
| URL (optional) | Individual HTTPS Vinted /items/ or Poshmark /listing/ URL. A filled cell updates Purchase link, the corresponding external listing URL and primary marketplace. Blank or omitted keeps current links. Shop/profile URLs and other hosts are rejected. Tracking parameters/fragments are removed. |

See [the example CSV](master-inventory.example.csv). Choose the currency for this file explicitly in the dialog. Each marketplace price stores its own amount and currency. When URL is filled, its marketplace becomes primary; otherwise the existing primary marketplace is retained. Its filled price updates Current listing price / currency. When changing marketplace without a CSV price for that store, a saved store-specific price is used if known; otherwise the old primary price/currency are cleared to avoid carrying a different store price over. Stored per-store prices are preserved. New items without URL use Poshmark when a Poshmark price exists, otherwise Vinted. Both marketplace links remain editable in Studio. The importer never invents or visits a listing URL, changes public shopping components, or updates either store.

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
5. Review item drafts in Content or Inventory, add any missing listing links and required fields, refine photo descriptions/crops, then publish. The existing schema validation still applies. Set the primary marketplace in the product editor if needed.

Existing slugs, reviews, categories, condition, fit notes, and unrelated fields are kept. A filled URL updates only its marketplace-specific link plus Purchase link and primary marketplace; the other marketplace link remains intact. A blank/omitted URL keeps all existing links. Blank optional cells **do not clear content**. To clear a field deliberately, use Studio. The preview shows reused assets and any missing/ambiguous filenames. Only rows selected for import require images; skipped rows do not. A nonempty IMAGES list explicitly owns gallery membership and order; photos removed from that gallery remain uploaded assets and are not deleted. A blank IMAGES cell preserves photos and crops.

One item stores both prices: it is not counted twice in Inventory. The summary uses the primary asking price, not a sum of both marketplace prices or sales revenue. Master imports do not claim that a live marketplace listing was checked, so they do not refresh `lastSuccessfullyCheckedAt`.

New product IDs derive from the stable, case-normalized master SKU. Existing document IDs and legacy import metadata remain intact when matching. The importer adds a read-only master identity to retain the association across publishing. Revision checks reject edits made since preview. Reruns update existing items or skip unchanged fields; they do not create duplicates. Records absent from a file are never sold, deleted or otherwise modified.

Imports respect your Studio account's permissions and import-disabled items. The results report created/updated/skipped/failed counts; partial successes stay saved, and failures retain original item content. Newly uploaded assets or shared brand labels can remain after a later item save fails; the importer does not delete shared data as rollback. Preview again before retrying. Manual edits work independently. No write token, extra API integration or bulk migration is required.

The upload implementation follows Sanity's [browser asset upload documentation](https://www.sanity.io/docs/apis-and-sdks/js-client-assets).

Category, Brand, Size and Condition filter options come from all products in the selected shopping section, before filtering or pagination. New category/brand labels are reused across imports, and Condition is stored directly on the product. Import and publish the item in Studio to make its new values appear publicly (allow the normal five-minute content cache to refresh). Category and Condition columns are optional so older master files remain compatible. Duplicate or draft-only category/brand labels must be resolved before import. Products stay drafts until explicitly published; creating a taxonomy label does not publish the product.
