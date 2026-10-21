# Amazon / organic launch audit and owner checklist

Implementation review: October 18, 2026. This is an engineering handoff, not Amazon approval, legal certification, or a ranking promise. No enrollment, production deployment, purchases, campaigns, bulk migration or live content writes were performed.

## Findings and implementation order

1. **P0:** Existing Amazon flow is a local CSV upload in Studio, not a licensed live shared-list API. The export contains 10 unique ASINs. No approved Amazon API configuration was found. A pending change would have proxied shared-list images through Next; that behavior has been removed. Existing product data is retained.
2. **P0:** Generic product fields could show manually maintained Amazon prices, stock/size claims and generic affiliate flags. Central Amazon guards now suppress prices, availability labels, available-size lists and price sorting, and replace CTAs with a clearly named Amazon destination. Other retailers and own resale pricing retain their existing behavior.
3. **P0:** Source and affiliate URLs were conflated. `purchaseUrl` remains the source; optional Amazon affiliate URL fields preserve generated URLs. Site settings control participation and the public US tracking ID. Item-level affiliate flags remain explicit. Inactive, invalidly configured and requested-gift links are ordinary links. No API credentials are stored in Sanity.
4. **P1:** Imported pages were eligible for indexing without original value. New imports are marked needs-review with indexing intent set to index. Amazon pages remain noindex until they have original commentary, shopper checks, a review date and editor approval. Tested/mannequin assertions also require actual evidence notes. There is no word-count cutoff.
5. **P1:** The previous privacy template claimed visitor accounts and named analytics that were not installed. Privacy now describes the code paths present. A disclosure page and near-link disclosures distinguish the experience/commission modes. Owner review remains required.
6. **P1/P2:** No analytics transport or consent system was found. A denied-by-default, provider-neutral event adapter is prepared. Existing newsletter signup uses a real MailerLite/server adapter path with provider-confirmed acceptance; it has not been used to send campaigns. Audience/content planning below requires the owner's evidence and account actions.

## Read-only configuration check

The configured Sanity dataset currently contains four product identities and no Amazon products. The attached CSV validates as ten unique ASINs and has not been imported into live content by this work. MailerLite token/group settings are present (provider validity and real acceptance still need an owner test). `SITE_URL` and the review-request adapter endpoint are unset. Configure those before launch; the current request form reports unavailable instead of falsely accepting requests. Presence checks printed no credential values.

## Source audit: import → Sanity → site → retailer

| Field                         | Current source and storage                                                                                      | Public handling                                                                                                                                                                                                                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ASIN / source URL             | CSV Product URL, allowlisted Amazon.com product URL, stable ASIN match                                          | Ordinary source URL retained separately from affiliate URL. Draft/published identity is deduplicated.                                                                                                                                                                                                   |
| Name                          | CSV Name creates editable product title; import reference retained for change detection                                          | Identification only; owner must improve verbose listing titles and add original value before indexing.                                                                                                                                                                                                  |
| Images                        | CSV Image URL is validated but new imports do not persist or fetch it. Existing URL/photo records are retained. | No Amazon image host in Next remote patterns. Old imported thumbnails are not rendered. Amazon product photos require source kind Original, or Licensed plus a public credit/permission reference. No Amazon API image display mechanism is claimed.                                                    |
| Description / specifications  | CSV Comment does not seed public commentary                    | Original Why I picked it is separate. Legacy description is hidden on Amazon items until editorial approval. Seller specifications are attributed separately, not presented as first-hand evidence.                                                                                                     |
| Price / rating                | CSV Price is stored as an admin reference price; Rating is ignored. Legacy snapshot fields may remain on records not re-imported                             | Never rendered from this export; no Amazon stars, customer reviews, offers, sale badges or stock schema. Legacy fields in a public Sanity dataset may still be queryable: hiding website output does not make dataset records private. Owner must review any future data relocation/removal separately. |
| Dates / priority / quantities | Owner's CSV wishlist metadata; no separate snapshot field                                                        | Quantities drive the owner's wanted/received workflow, not retailer stock. Received items leave My Wishlist but remain Curated Finds.                                                                                                                                                                   |
| Affiliate attribution         | Source CSV has no trustworthy commission setup                                                                  | Off by default. Only enrolled, valid account settings plus item/annotation affiliate choice enable tagged links. No final-approval gate; valid links can be used during application review.                                                                                                             |

Repeats preserve title, slug, notes, photos, quantities and affiliate decisions. Closet matches and duplicate ASIN matches are refused. Missing rows never delete records. Existing data needing review is flagged by the Studio **Review Wishlist → Amazon content audit** section without a bulk migration. Add full original editorial content in **Content → Shopping item**.

## Configure and review content

- In **Site settings → Amazon Associates**, leave activation off until enrolled. Enter your real US Associate tracking ID (ending in `-20`) when available. It is a public attribution ID, not a secret. There is no PA API / Creators API client in this implementation.
- For each commission recommendation, enable the existing Affiliate link field. The app uses a generated tagged ordinary product URL or an optional separate Amazon-generated URL. Full valid Amazon URLs keep their parameters. A supplied tag must match the configured tag. Tag validation checks format, not membership/account validity; verify the enrolled account yourself. Full product links must match the source ASIN. `amzn.to` URLs require explicit owner confirmation of product and account; the app does not resolve/follow them. Bad links fall back to a safe ordinary source URL or no link.
- Gift requests on My Wishlist stay ordinary links. Do not frame affiliate clicks as gifts, rewards, support payments or incentives. Do not encourage close contacts or business connections to order through your Special Links.
- Select personally tested, mannequin-only or curated/not-tested. Add original selection reasoning, real tested size/measurements when known, defensible observations, clearly attributed seller facts, limitations, an editorial date and related reviews/guides. Product videos reuse the accessible video player; supply captions and a transcript.
- For original/licensed images, mark the source on each existing photo. Public licensed-image credits should contain no confidential contract information. Unverified images remain saved but hidden for Amazon products. Check social metadata as well as cards/details.
- Index a page only when genuinely useful. Set content review to approved. Indexing intent defaults to index, and the runtime still requires the substantive fields above. This is an editorial workflow, not proof of policy compliance.

## SEO and measurement handoff

- `/shop/finds` remains a stable crawlable collection, keeping the existing tabs; local detail pages stay `/shop/[slug]`. `/my-wishlist` is a noindex gift-request subset; visitors' `/wishlist` remains separate.
- Primary text and links are server-rendered. Existing breadcrumbs, product metadata and social fields are reused. Canonicals omit filters; archive query variants use noindex/follow. Robots permits crawling those variants so the noindex can be seen, while Studio/API are disallowed. Drafts, previews and thin Amazon pages do not enter the sitemap. No Product/Offer/AggregateRating structured data was introduced; existing editorial article markup must continue matching visible content.
- Set a valid production HTTPS `SITE_URL`. Without it, production metadata is conservatively noindex and no sitemap is advertised. Configure the actual domain rather than relying on localhost metadata. Use a real staging noindex policy separately if needed.
- Owner: verify the domain in Google Search Console via the offered DNS/HTML mechanism, submit `/sitemap.xml`, inspect a reviewed collection/product URL, and review indexing reports. No Search Console account was accessed.
- No analytics provider is newly installed. To measure outgoing clicks, choose/review a provider and applicable consent flow, connect a listener, then enable click events in Studio. After consent, the consent adapter dispatches `window.dispatchEvent(new CustomEvent('cgr:analytics-consent', {detail:{granted:true}}))`; dispatch false on withdrawal. Re-emit after adapter initialization. The tracking component starts denied every page load.
- Listen for `cgr:amazon-outbound`. Payload is `{productId, sourcePage, placement, experience}`; the path omits query parameters. Placements are product/collection/review/guide and experience is tested/mannequin/curated. No user IDs, email, search terms, cookies or visitor-specific Amazon sub-tags. Events are suppressed for DNT/GPC. There is no network request, storage or navigation delay in the hook. Connect it only after privacy/consent review.
- Website analytics can report outbound clicks; Amazon separately reports qualified purchases/commissions. No Amazon checkout completion is observed by the site. Keep all attribution IDs static/account-level.

## Editorial starting slate — drafts to write, not published placeholders

Approximately ten substantial original posts is a starting target, not an approval guarantee. Evidence quality matters more than length. Publish real recent work at a sustainable pace (for example two articles per week), not ten thin copies of listings.

| Working title                                         | Reader question / intent                       | Owner evidence needed                                                                    | Related products                                                            | Internal links                         | CTA                                                 |
| ----------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------- |
| The jeans I already own: waist fit versus pocket room | What actually fits a size 16–18 body?          | Real owned jeans, worn size, front/back/seated photos, honest pocket test                | Link a real owned product/review; do not use the fictional demo as evidence | Measurement guide, About               | Read the evidence; check the related item if useful |
| Measure before you order: bust, waist and hip guide   | How do I compare my measurements with a chart? | Original diagrams, verified measurement method, actual Shannequin values if referenced   | Relevant owned clothes                                                      | About/Shannequin, size-chart article   | Use the checklist                                   |
| Why this satin-look shirt is on my radar              | What would I check before trying it?           | Original selection notes, clearly sourced size chart, authorized imagery                 | CSV ASIN B0C5R6Q2XZ (untested until you try it)                             | Measurement guide, later real review   | Check price & sizes on Amazon                       |
| Hoop earrings: visual size and styling questions      | Which size suits the look I want?              | Original scale drawings/photos of owned examples; source dimensions attributed           | CSV ASIN B0FS1TZH8Z, no wear/comfort claim without use                      | Styling guide, About                   | See product details / Amazon when appropriate       |
| A sweater vest shortlist for layering                 | How might I layer this shape?                  | Original outfit reasoning, seller facts attributed; no invented stretch/fit results      | CSV ASIN B0CNWSYMDN, other vetted finds                                     | Shoulder/chest measurement guide       | Check the selected item on Amazon                   |
| Size 16 or 18? Reading two different size charts      | Why do numerical sizes vary?                   | Actual charts, original comparison worksheet, known measurements, no pasted descriptions | Choose actual current brands in Studio                                      | Measurement guide, real reviews        | Compare your measurements first                     |
| Me versus Shannequin in the same garment              | What can a mannequin demonstrate?              | Same garment on owner and mannequin, measured sizes, human movement photos/video         | A real shared-test garment                                                  | About/Shannequin, the garment's review | Read the human test and its limits                  |
| A wrap dress: standing versus sitting                 | Will the closure work in my situation?         | An owned/borrowed/gifted dress actually tested seated/standing; honest limits            | Select the real tested item                                                 | Layering ideas, size guide             | Read the review; view relevant buying options       |
| One outfit, three styling choices                     | How do I style pieces I already own?           | Original outfit photos and why each combination works for you                            | Actual owned pieces; related untested finds labeled separately              | Jeans review, vest shortlist           | Explore the pieces with clear experience labels     |
| After several washes: what changed?                   | Did a specific garment keep its shape?         | Real dated wash/use notes, care method, before/after photos and measurements             | The actual repeatedly used garment                                          | Original first-impression review       | Compare first impressions with the follow-up        |

Reusable social formats: a measured waistband demonstration tied to the measuring guide; a seated/standing garment clip tied to the real wrap review; an original split-screen owner/Shannequin demonstration; an original diagram carousel explaining two size charts; a clearly “not tested” radar pick linking to the researched article. Use owned/authorized media. Register exact eligible social profile URLs, check current platform rules and include disclosures in the medium of any affiliate recommendation. Do not assume every social network is an accepted Associates application property.

Newsletter sequence (owner approval before sending): (1) welcome with the measurement guide; (2) a genuine review plus what evidence was checked; (3) a clearly labeled researched shortlist and a request for future review ideas. Link to useful website content, not an unreviewed affiliate promotion. Existing MailerLite signup must be acceptance-tested by the owner, including confirmation, unsubscribe and group/automation configuration. No campaigns or test subscriptions were sent.

## Actionable launch sequence

### Before applying

- [ ] Confirm public domain ownership, valid HTTPS SITE_URL, hosting, mobile navigation and a working Contact address.
- [ ] Review the source audit and every Amazon image/content record; provide original/authorized media and original copy.
- [ ] Write the initial substantial slate with recent work; retain evidence for each personal or mannequin claim.
- [ ] Review About, Privacy and Disclosures with the owner/adviser. Supply real retention/provider details and decide any additional regional consent requirements; the text makes no legal certification.
- [ ] Test mobile/desktop cards, detail pages, ordinary Amazon links, Vinted flows and real form acceptance.
- [ ] Decide analytics and consent setup; verify no outbound events before consent and no navigation delays.
- [ ] Verify Search Console, sitemap and representative canonicals/noindex decisions. Remove production sample content (demo is already production-disabled).
- [ ] Build an initial organic audience with the article/social/email plan rather than manufactured orders or placeholder pages.

### After enrolling

- [ ] Enter the valid US tag, activate links/disclosures, and explicitly select appropriate affiliate recommendations. Final approval is not a prerequisite during review.
- [ ] Complete Amazon tax/payment requirements and register all applicable site/profile URLs accurately.
- [ ] Verify full generated links, any confirmed short links, visible near-link disclosures and the site's required Associate statement. Ordinary/gift links must stay ordinary.
- [ ] Keep API secrets server-side if a separately verified API integration is later authorized; do not unlock CSV price/image display simply because an account was enrolled.

### During application review

- [ ] Monitor the account's qualifying-sales requirement and deadline: at least three qualifying sales in 180 days under the currently checked US application guidance. Personal orders do not count.
- [ ] Do not solicit affiliate purchases from friends, relatives or business associates or incentivize clicks/orders.
- [ ] Watch account notices, links, source permissions and content accuracy. Review website click reports separately from Amazon purchase/commission reports.
- [ ] Continue useful original publishing. Account decisions and organic rankings remain outside this implementation's control.

## Official references checked October 18, 2026

- [Amazon US application review](https://affiliate-program.amazon.com/help/node/topic/G8TW5AE9XL2VX9VM): originality, recent public content, review-stage sales and application properties.
- [Amazon US program policies](https://affiliate-program.amazon.com/help/operating/policies): current price/availability, program-content, ratings, tracking and promotional restrictions; policy page reports an April 14, 2026 update.
- [Amazon disclosure guidance](https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98): clear near-link disclosure plus Associate identification. The required site statement is rendered by the shared disclosure component when active.
- [Google review guidance](https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews): evidence, original analysis and decision usefulness.
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies): avoid scaled low-value/affiliate content and misleading intermediaries.

Re-check official rules before enrollment and any future API, image-license or promotion changes. Owner/account actions above were not performed automatically.

## Verification completed

- TypeScript and repository ESLint: passed without errors or warnings.
- Unit tests: 84 passed, including URL/tag modes, image/price guards, indexing decisions, import ownership and marketplace regressions.
- Browser tests: 13 passed across desktop/mobile Amazon policy/consent, product galleries/details, review layout and CSV import/publish/received/delete fixtures. New Amazon and disclosure accessibility checks reported no WCAG violations; actual changed pages fit desktop/mobile widths.
- Production build and formatting/diff checks: passed. The build still reports the missing production metadata origin (SITE_URL) and an existing local extra-certificate path warning; these are environment setup items, not an API integration or account approval.
- All mutation tests used isolated fixtures. Live Sanity access was read-only; no products were published/imported, forms submitted, campaigns sent, purchases made or production deployed.
