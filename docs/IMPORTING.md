# Authorized product imports

No scraper, private Vinted API, or server-side image downloader is implemented. Frontend components read normalized Sanity product documents regardless of their source. Manual products work independently.

Use JSON with `version: 1`, a stable lowercase `source` key identifying your authorized supplier, and `products`. See `products.example.json` (illustrative only; replace every sample value). Each record requires:

| Field                     | Rules                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| externalListingId         | Stable supplier ID, 1–100 letters/digits/underscores/hyphens                      |
| title                     | 1–160 characters                                                                  |
| listingPrice              | Finite number >= 0                                                                |
| currency                  | USD, GBP, EUR, CAD, AUD, PLN, CZK, SEK, DKK                                       |
| availability              | available, reserved, sold, unknown                                                |
| vintedUrl                 | HTTPS allowlisted Vinted domain, `/items/<numeric-id>` path; tracking is stripped |
| lastSuccessfullyCheckedAt | ISO timestamp including timezone; no future timestamps                            |

Optional fields: description (5000 chars), size (60 chars), condition (one of the Studio choices), `photoAssetRefs: [{"assetRef":"image-<hash>-<width>x<height>-jpg","alt":"Description"}]`. Upload owned/authorized photos through Studio first and reference their Sanity asset IDs. Connected runs verify the assets exist. Raw external image URLs, arbitrary fields, HTML payloads, and review bodies are rejected. Nothing fetches a URL from an import file.

```sh
npm run import:products -- docs/products.example.json --dry-run
npm run import:products -- /absolute/path/authorized-products.json --dry-run
npm run import:products -- /absolute/path/authorized-products.json
```

Create `.env.local` first. Dry runs without project configuration perform offline validation and report proposed creates; they explicitly cannot check remote matching or asset existence. With configuration they read existing records but never mutate. Live runs require a server-only Editor token (`SANITY_API_WRITE_TOKEN`). Never put it in `NEXT_PUBLIC_*`, source code, or browser code.

Identity is the SHA-256 hash of `source + NUL + externalListingId`. Matching also queries the composite identity so preexisting documents are respected. A duplicated identity or an outstanding draft skips the record for editorial resolution. Repeated IDs within a file skip later duplicates. Creating uses a strict transaction create, so concurrent collisions fail rather than silently overwrite. Updating requires the fetched revision, so concurrent editorial edits cannot be overwritten.

On creation the importer initializes title, slug, description, size, condition, asset references, source, and listing fields. On subsequent runs it owns **only** listingPrice, currency, availability, vintedUrl, and lastSuccessfullyCheckedAt. It cannot overwrite title, description, slug, photos, crop/hotspot, brand, categories, size, condition, review links, or editorial content. Switch off “Allow listing updates from imports” to protect all fields. To change editorial fields use Studio. Manual-source records cannot be updated by the importer.

Unchanged or older check timestamps skip updates, making reruns safe. An absent item is never changed or sold. Failed validation/network requests leave prior content intact. The summary reports created, updated, skipped, failed; dry-run counts indicate planned actions, not writes. Any failed record gives a nonzero process exit. Partial successes remain saved; fix failures and rerun safely. Availability older than seven days or without a successful check is visibly identified as not recently verified. Sold products remain related to their reviews and never get a purchase action.

The feed producer is responsible for authorization, truthful prices/availability, and actual check timestamps. The importer does not claim to check Vinted itself. A future supplier adapter should emit this format rather than changing frontend components.
