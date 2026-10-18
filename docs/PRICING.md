# Private “Price This Item” assistant

This extends the existing Inventory tool and Shopping item document actions. Open `/studio/inventory`, select **Price This Item**, or use that action in the Shopping item editor. Existing counts, filters, sorting, search, pagination, currency totals and empty state remain intact. The empty state includes an editor Create link using existing closet defaults.

## Setup

The existing `production` dataset was inspected read-only and is **public**. Costs and pricing records must not be stored there. No private dataset was created, no inventory was seeded, and no live AI calls or pricing mutations were made during development.

1. In [Sanity Manage](https://www.sanity.io/manage), create a **separate private dataset in the existing project**. Verify your plan permits another private dataset. Set `SANITY_PRICING_DATASET` to its actual name. Every endpoint verifies visibility and refuses public datasets or the main product dataset.
2. Set `PRICING_ADMIN_USER_IDS` to your comma-separated **personal Sanity user IDs**. With a signed-in session and no allowlist configured, the setup message gives your own user ID. Do not put API tokens in this value. Only allow intended pricing administrators.
3. Give these accounts read/create/update/delete permissions for private pricing documents and locks, plus draft-write permissions for the existing Shopping item dataset. Review other project members' dataset access: private-dataset access granted directly in Sanity permits direct API reads independently of this app's allowlist. Restrict that access to intended users. No server Sanity service/write token is used; all operations run with the logged-in user's permissions.
4. Set server-only `OPENAI_API_KEY` and `PRICING_AI_MODEL` to an available **image-capable model supporting Responses API Structured Outputs**. See official documentation below. API access is separate from a ChatGPT subscription. No invented model fallback or mocked estimate is displayed.
5. Restart `npm run dev` or set these four values in the appropriate Vercel environments and rebuild. No additional `NEXT_PUBLIC_*` values are required. Studio uses token login to send the authenticated user's session token to same-origin pricing endpoints. If an existing cookie session does not provide a token, sign out and sign back in. Session tokens are not added to environment variables or logs.

Without private storage/allowlist, pricing shows setup feedback while Inventory remains usable. With storage but no AI key/model, calculators, existing history, manual evidence and sale recording remain available; generation is disabled.

### Assessment errors

Provider failures identify API billing/quota, invalid keys, model/Responses permissions, rate limits, schema/image request failures, or connection timeouts. Failed private analysis records retain a fixed, safe `failureMessage`; provider payloads and credentials are never copied into error feedback. A successful model-access check does not establish that the project has credits for generation. After changing environment values, restart the server and retry once to read the specific message. See [OpenAI error codes](https://developers.openai.com/api/docs/guides/error-codes) for provider guidance. Earlier failed records may lack `failureMessage`; they remain unchanged.

## Workflow

The five sections show saved item details/images, costs and goal, comparables, recommendation/offer calculator, and private history/actual sales. Update physical details through the existing editor: style/model, material, optional measurements, wear notes and up to eight additional label/defect photos are backward-compatible additions. Existing condition strings are retained; Excellent and Fair are additional options with definitions. These physical fields and their assets are public: never put private costs there.

Private records reference the canonical product ID without `drafts.`. Drafts take precedence. Both entry points and every endpoint exclude Curated Finds and primary affiliate listings using the established shopping section, including the missing-section closet fallback. An optional affiliate shop-new link does not exclude an owned closet item.

Costs use the existing currency. Acquisition cost can explicitly be unknown; it is not zero. Enter zero only for genuinely absent expenses. Personal closet cash recovery after selling costs is separate from profit after original acquisition. Overhead allowances are included in selling costs. Estimates are before tax; unentered taxes, returns and other costs are excluded. Fees are configurable: percentage of **item price**, plus fixed seller fee. Seller-paid shipping is counted once; buyer-paid fees are excluded. Verify country/channel fees. The zero default is an editable unconfirmed assumption, not a claim about Vinted policy.

Money uses integer cents, validated two-decimal inputs and integer basis points (100 = 1%). Floors round upward; proceeds round down. TypeScript functions perform authoritative arithmetic. AI sees item details, selling preference and supplied evidence, not acquisition cost or profit targets, and does not override calculations.

Manual evidence distinguishes asking prices from **confirmed accepted sale prices**, not merely a Sold badge. Select relevance deliberately, explain differences and verify dates/shipping. Different currencies are excluded without conversion. Relevant recent confirmed sales carry stronger confidence; weak or old evidence is flagged. Add one of the 50 most recent private recorded sales as evidence; the server validates price/currency/date against its actual record. Create a manual comparable for deliberately edited observations. No comparable URLs are fetched; no marketplace scraping, posting or synchronization exists.

The OpenAI adapter uses the official SDK and schema-validated Responses output. It sends up to eight trusted project image assets, bounded to 1200px for analysis. Text/image content is untrusted data, not instructions; no browsing tools are enabled. Every AI evidence ID must match supplied evidence. Confirmed condition/defects take precedence; visual features are suggestions to confirm, not designer authentication or sale/profit guarantees. Code determines confidence from supplied relevance, currency and recency. Weak evidence shows **“Preliminary estimate—limited market evidence”** and may yield unavailable market values. A market estimate below the floor shows **“Unlikely to meet your profit target at current market prices.”** Market values are not raised to match your target.

Generation stores private snapshots but never changes asking price. Choose a price/offer to see proceeds, profit, floor and below-floor warnings. **Apply Price to Draft** explicitly changes only `listingPrice` and `currency`, preserves unrelated draft edits and never publishes. Review/publish through the editor. Update the selected Vinted or Poshmark listing manually. For imported items, disable **Allow listing updates from imports** to protect your manually approved asking price from subsequent imports; pricing does not change import ownership automatically.

Changed inputs mark results outdated. Regenerate or explicitly review changed costs/item details before applying. Currency changes require re-entering costs and regeneration; old values are not converted. The server independently checks snapshots, eligibility, available status and expected revision. Drafts receive revision-guarded patches. Published-only items use an atomic no-content-change revision assertion on the source and strict draft creation, protecting against concurrent changes. No publishing occurs.

Sold items allow analysis/history and private actual-sale records, but cannot apply an active price until returned to Available through the existing workflow. Record actual accepted price, sale/listing date when known, acquisition and total selling expenses including fees. Unknown expenses disable reliable proceeds; unknown acquisition disables realized profit. Actual prices remain separate from asking prices; inventory asking-price totals are never revenue.

## Security and recovery

`GET`/`POST /api/studio/pricing/[canonical-id]` require a verified personal Sanity token, configured admin allowlist, actual private-dataset authorization, verified private visibility and server-checked eligibility. A Studio origin alone grants no access. Responses are private/no-store/noindex. Provider keys remain server-only. Private data is loaded at runtime only for authorized editors; no private schema/data/query is added to public shop code.

Limits: 100 KB request, 30 comparables, eight images, validated money/fees, 45-second provider timeout with no retries, 15-second Sanity request timeouts, five analyses per admin per ten minutes. Durable per-item locks block overlapping submissions, and per-admin generation locks prevent concurrent requests bypassing the analysis quota; expired locks recover after two minutes. Deterministic request IDs deduplicate operations; UI actions disable while pending. Failures do not appear as successful analyses.

Private types: `pricingAnalysis`, `pricingApproval`, `pricingSale`, `pricingLock`. No private Studio workspace or competing product type is required. Analysis snapshots retain item/input/evidence/fees/provider/model/timestamp; approvals retain chosen price, reviewed inputs, timestamp and pending/applied/failed state. History uses cursor pages of 20 with Load more. Sales and approvals for an individual item remain inspectable. Dataset backups/exports must remain private.

Cross-dataset writes cannot share a transaction. The API first saves a pending private approval, writes the product draft, then finalizes the audit. If finalization fails after committing the draft, the UI says the price was saved but audit completion failed. **Inspect the actual draft and pending approval before retrying.** Resolve the audit with an authorized Sanity administrator; do not assume an HTTP failure rolled back the draft. Administrators can inspect failed/pending analyses and expired locks. No automatic publish or uncertain rollback occurs.

Inventory refreshes after apply. Panel Reload refreshes item/history; concurrent changes are rejected on apply even before refresh. Public publishing/cache behavior remains as implemented.

## Verification

With Node 24:

```sh
npm install
npm run typecheck
npm run lint
npm run test
npm run build
npm run dev
# Another terminal:
npx playwright test tests/browser/inventory.spec.ts tests/browser/pricing.spec.ts
```

Tests cover calculations/rounding, unknown costs, fees, eligibility, private storage/authorization, invalid evidence references, stale/concurrent edits, sold states, draft-only writes and existing inventory summaries. Browser fixtures cover desktop/mobile, keyboard focus, explicit stale approval, setup failure and Inventory regression. Fixtures never substitute production responses. Actual authenticated end-to-end checks require configuration above; automated accessibility checks do not certify full compliance.

Official references checked:

- [Sanity private dataset security](https://www.sanity.io/docs/content-lake/keeping-your-data-safe)
- [Sanity authentication](https://www.sanity.io/docs/content-lake/http-auth)
- [Sanity token login](https://www.sanity.io/docs/studio/custom-auth)
- [Revision-guarded transactions](https://www.sanity.io/docs/content-lake/transactions)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- [OpenAI image inputs](https://developers.openai.com/api/docs/guides/images-vision)

New pricing assessments default their selling channel to the product’s selected closet marketplace. Fees still require confirmation for that marketplace/country; no Poshmark fee schedule is automatically assumed. Existing saved inputs are reused only when both currency and marketplace match.
