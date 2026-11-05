# Phase 2B deletion verification and execution record

Dataset: Sanity project `cqr54onh`, dataset `production`. Pre-deletion verification: 2026-11-01. The pre-deletion findings below are retained for audit history. The owner subsequently authorized deletion of exactly the listed 22 IDs, and the transaction committed successfully on 2026-11-01 at approximately 23:38 UTC.

## Current counts and comparison

94 documents scanned: `product` 22 (10 published/other, 12 drafts), `find` 2, `look` 2, `homepage` 1, `siteSettings` 1, `aboutPage` 1, `author` 1, `brand` 3, `clothingCategory` 11, `sanity.imageAsset` 36, `sanity.previewUrlSecret` 2, `system.group` 11, and `system.retention` 1. Counts and all 22 target IDs are identical to the November 1 dry run. No added or removed targets.

## Exact deletion candidates: `product` only

Published/other (10):

- `amazon-find-b0c5d4p5qz`
- `amazon-find-b0c64v94zc`
- `amazon-find-b0fbgrj5tf`
- `amazon-find-b0fs1tzh8z`
- `amazon-find-b0g6979bc3`
- `amazon-find-b0gt4qp8pq`
- `master-inventory-63af0e0d839c94b107a4b9d567f77d36284be8c8`
- `master-inventory-8a5affdbe3719bcaabe79d5a667c9e521bd4a796`
- `master-inventory-99cc6f5088a26acbc23fa086d368886f6255731c`
- `master-inventory-d5b6e7dc3ef2423ce42a31cf952618fe3e865340`

Drafts (12):

- `drafts.amazon-find-b0c5r6q2xz`
- `drafts.amazon-find-b0cnwsymdn`
- `drafts.amazon-find-b0d1dl52k5`
- `drafts.amazon-find-b0d7db6shk`
- `drafts.amazon-find-b0dcbhj37r`
- `drafts.amazon-find-b0dj1bfj8q`
- `drafts.amazon-find-b0f9w42z1k`
- `drafts.amazon-find-b0fvs4z1dv`
- `drafts.amazon-find-b0fzr6g8rz`
- `drafts.amazon-find-b0gmgnl61g`
- `drafts.amazon-find-b0gqgbjql7`
- `drafts.amazon-find-b0hgdszpty`

## Dependency and asset checks

- Incoming strong references: **0**. Incoming weak references: **0**. The audit recursively inspected all current documents. No additional document would be changed by deletion of these IDs alone.
- Product assets shared with non-product documents: **0**. No `sanity.imageAsset`, file asset, or other asset is a deletion target.
- The two `find` IDs (`65eed9e3-643d-49df-9e5f-e82c3855bfdc`, `b15a3e57-2379-4414-9e67-5d34f962893f`) and two `look` records (`drafts.f8c9b863-91f6-403e-8a6d-2b89154aae41`, `f8c9b863-91f6-403e-8a6d-2b89154aae41`) are outside the target set. The two Look records are draft and published variants of one Look.
- Public route code has no `getDocuments('product')` call. The deployed homepage, `/shop`, and `/shop/closet` returned HTTP 200 from Vercel. Public responses cannot independently prove the exact deployed source commit; the owner has manually verified the Phase 2B deployment.

## Backup and remaining risk

The local backup `imports/phase2b-production-2026-10-28.tar.gz` is 39,688,683 bytes. Its SHA-256 matches `f92208082af9927df44b18b281adb8a135672a84949b8c3f315697994ba22927`. The owner confirms the complete backup is secured in private offsite storage and that historical listing and reference prices will be retained there; offsite storage itself was not independently accessed in this audit.

## Execution and post-deletion result

Immediately before execution, the audit confirmed the configured project and dataset, all 22 IDs and types, an exact match to the approved allowlist, zero incoming strong or weak references, both Finds and both Look variants outside the target set, and the backup checksum above. The Sanity client submitted one transaction containing exactly 22 explicit delete mutations and no other mutations. Its result reported 22 deletions.

Immediate read-only verification found **0 remaining `product` documents** and **0 approved IDs still present**. The dataset contained **72 documents**: `find` 2, `look` 2, `homepage` 1, `siteSettings` 1, `aboutPage` 1, `author` 1, `brand` 3, `clothingCategory` 11, `sanity.imageAsset` 36, `sanity.previewUrlSecret` 2, `system.group` 11, and `system.retention` 1. Every non-target document from the pre-deletion snapshot remained present with the same type and revision. No asset was deleted.

The production homepage, `/shop`, `/shop/closet`, `/support`, and `/reviews` each returned HTTP 200 after deletion. These are smoke checks, not a full page-functionality review. No errors or unexpected changes were observed. The verified backup is the recovery source; any restoration to production requires separate review and authorization. No application code was changed as part of the deletion.
