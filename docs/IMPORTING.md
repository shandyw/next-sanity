# Content entry after Phase 2B

The legacy product JSON, master inventory CSV, and Amazon review wishlist CSV importers were retired with the `product` schema. They are not supported workflows. The verified pre-deletion Sanity backup remains in `imports/` and must be preserved.

Create **Finds** and **Looks** in Sanity Studio. A Find holds its Amazon URL, ASIN, category, and experience status; a Look can reference ordered Finds. Reviews can optionally reference a primary Find. Manage closet listings on Vinted and configure the Vinted shop URL in Site Settings. The external Amazon gift wishlist is configured in Site Settings for the Support page.

See [Phase 2B status](PHASE-2B.md) and [the deletion execution record](PHASE-2B-FINAL-DELETION-VERIFICATION.md).
