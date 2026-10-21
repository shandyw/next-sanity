# Catalog verification — October 19, 2026

Validated locally with Node 24.13.0 and the repository's installed dependencies.

- `npm test`: 95 passed, 0 failed. Includes actual GROQ projection evaluation, import/editorial preservation, source/placement compatibility, sold/archive actions, consent, references, additive migration planning and the executable migration CLI (including refusing existing output files).
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed, including prerendering with configured published content. Fixed the discovered GROQ-null placement fallback and added regression coverage. The initial sandboxed build stalled; the successful build used local process permissions.
- 41 distinct targeted Playwright checks passed across the following files (affected inventory/master checks rerun after correcting obsolete fixture expectations): `amazon-policy`, `product-details`, `review-wishlist`, `saved-finds-navigation`, `wishlist`, `inventory`, `master-inventory-import`, `product-carousel`, `shopping-sections`.
- Desktop/mobile checks include keyboard navigation, save persistence/tab synchronization, blocked storage and failed writes, unavailable saved IDs, dialog behavior, marketplace/product actions, CSV previews, draft publication/deletion, retained editorial titles, repeat-import skipping and automated accessibility checks where the suites include them.
- `git diff --check`: passed.

Browser routes used development demo content with Sanity and delivery integrations explicitly disabled. Studio tests use local authenticated-client fixtures, not live mutations. The production build reads configured public content; no production writes, deployment, credential changes or migration application occurred. Tests do not establish a full manual accessibility audit or live Studio/provider delivery verification.

[Catalog operations and remaining configuration](../../CATALOG.md) documents the real wishlist/marketplace URLs, content approval, public dataset exposure, authenticated inventory audit, backups, migration review and rollback. Production apply remains a separate approval step. Existing public Sanity reference fields/assets are not made private by frontend projection changes.
