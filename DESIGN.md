---
version: warm-editorial-2026-10-13
name: CurvyGirlReviews
description: Honest, sassy, fashionable, real. Warm editorial fashion with strong serif typography, restrained script and clean photography.
---

# CurvyGirlReviews design specification

This is the canonical specification for the current Next.js site. The October 13 homepage reference supplies composition; its sample photographs and review claims are illustrative. Written requirements and the semantic tokens below override conflicting screenshot details. Historical documents in `legacy/` are archived references, not competing design defaults.

## Voice and visual direction

Write honestly and directly, with personality and practical fit questions. Firsthand reviews describe items actually tried. Curated Finds and research must identify their evidence and must not imply firsthand experience. Never fabricate try-ons, sizes, testimonials, measurements, ratings or discounts to fill a layout.

Use strong editorial serif headings, short flowing script accents, clean sans-serif copy, straight photographs and berry/pink emphasis. Photography does the visual work. Avoid decoration that obscures garments or implies that noninteractive photographs are links.

## Shared tokens and permitted color pairings

`app/globals.css` owns the semantic palette. Tailwind 4 uses the existing `@theme inline` aliases. Compatibility names resolve to these same tokens, not to a parallel theme.

| Token                                         | Value     | Role                                         |
| --------------------------------------------- | --------- | -------------------------------------------- |
| `--color-page-background` / `--color-neutral` | `#FFFFFF` | Warm page background                         |
| `--color-surface`                             | `#FFFFFF` | Fields and modal surfaces                    |
| `--color-primary-ink` / `--color-on-surface`  | `#11151c` | Body text and headings                       |
| `--color-ink-soft` / `--color-text-secondary` | `#5A4650` | Captions, labels and supporting copy         |
| `--color-primary`                             | `#c71585` | Maroon primary actions                       |
| `--color-link` / `--color-primary-deep`       | `#c71585` | Readable berry links and text accents        |
| `--color-primary-button-ink`                  | `#FFFFFF` | White labels on maroon backgrounds           |
| `--color-secondary-ink`                       | `#11151c` | Text on secondary buttons                    |
| `--color-brand-pink` / `--color-pink`         | `#FFF0F5` | Selected editorial text highlights           |
| `--color-secondary-action`                    | `#FF1493` | Optional secondary pink fill with ink labels |
| `--color-cream`                               | `#F7ECDD` | Compact coming-soon panel and shop filters   |
| `--color-pink`                                | `#FCE6EA` | Wishlist banner, gifting and soft panels     |
| `--color-border-control`                      | `#767076` | Meaningful input/control edges               |
| `--color-focus`                               | `#2C1E23` | Visible focus outline                        |
| `--color-border`                              | `#E2E0DA` | Decorative separators only                   |
| `--color-success`                             | `#187441` | Valid-format tick                            |
| `--color-error-text`                          | `#B4232C` | Error text                                   |

The invalid-email boundary retains `#C74D58`; selected wishlist hearts retain red `#FF3333` as an interaction state. Yellow preview notices are semantic warnings, not brand actions. Do not use low-opacity body text or gradients on buttons.

Required reference pairings are white on berry (about 9.96:1), soft ink on page (about 8.41:1), primary ink on pink highlight (about 11.81:1), and primary ink on secondary pink (about 7.10:1). Check actual computed states, including hover, active, selected and focus. Control edges and meaningful icons require at least 3:1; normal text requires 4.5:1. Decorative separators need not be mistaken for input outlines.

## Fonts and responsive typography

- **Headings and review titles:** Lora Semibold, genuine weight 600, self-hosted and preloaded with `next/font/local`. The Latin WOFF2 and OFL license are in `public/fonts/lora/` (Fontsource 5.2.8). `--font-display` references `--font-editorial-serif` directly, without a duplicated Georgia/Times font stack. Next.js provides a metric-adjusted serif loading fallback and generic serif recovery if the font cannot load. No external font service is contacted by visitors or builds.
- **Large display numbers:** Use Lora Semibold (600) through the shared `--font-display` token, with lining proportional numerals and tight `-0.09em` spacing. There is no separate number-font token. Use this for decorative numbers such as Shannequin’s “18”; ordinary prices, counts and metadata retain the body font.
- **Body, navigation, forms, buttons and metadata:** existing licensed Manrope Variable, weights 400–800, self-hosted through the installed Fontsource package.
- **Short large accents:** Dancing Script Variable, genuine weight 600, self-hosted with `next/font/local` and loaded when used. Preloading is disabled for this occasional accent font so routes without script text do not preload an unused font. Source: Fontsource 5.3.0; WOFF2 and OFL license are in `public/fonts/dancing-script/`. No external Google Fonts request or outlined imitation weight is used.

`--font-display` / `--font-heading` resolve to the local Lora font variable. Serif heading rules use weight 600. `--font-body` is Manrope. `--font-script` is the local script variable. The compatibility `--font-hand` resolves to script but must not be used for ordinary UI.

Hero headings use approximately 42–76px on wide screens and 32–64px on small screens, with natural wrapping and a tight serif line height around 1.08. Section headings are approximately 30–58px; preview titles are 28–38px. Body copy is generally 16–18px at 1.5–1.65 line height. Supporting text is at least 14px. Script uses generous line space, genuine 600 strokes and no clipping; it is restricted to “Questionable” and the short Shannequin accent. Never use script in controls, paragraphs or metadata.

Use real selectable HTML text, one H1 per page and logical heading levels. Reading copy generally caps at 60–70ch where appropriate; do not impose a universal width on every paragraph.

## Containers, grids, spacing and photography

The existing container caps at 1200px including gutters: 48px desktop, 32px below 1200px and 20px below 768px. Use the 4px/8px spacing scale. Major sections are roughly 64–96px apart on desktop and 40–56px on mobile; compact homepage groups may sit closer.

The hero is a two-column text/photo grid above 768px and a stacked composition below. Review grids use three columns, two below 900px, and one below 600px. About and Shannequin use balanced two-column layouts that stack below 768px. Controls use the shared 52px height; large primary CTAs use 58px. Aim for 44×44px interactive hit areas.

Reserve image dimensions, use responsive `sizes`, and preserve Sanity crop/hotspot data through `ContentImage`. Review photographs are normally 4:5; About uses a straight landscape crop. Shannequin’s full-body image uses `ContentImage` with `preserveFullImage`: the original asset is resized with Sanity `fit=max`, bypassing crop/hotspot metadata and reserving its actual aspect ratio. CSS `contain` keeps feet and silhouette visible. Hero outfit/detail images use coordinated 3:5 portrait crops, overlapping grid columns and staggered top/bottom edges. The smaller frame sits above the main frame with its stronger approved shadow. Do not force unrelated stock imagery to represent the owner, a tested item or Shannequin.

## Buttons, links, forms and dialogs

Primary pill buttons use solid maroon (#7A2345) with white labels. Dark hover backgrounds retain white labels. Hover/active adds a restrained ink inset boundary; labels stay stationary. Ghost actions use ink outlines and ink text, with blush fill on hover/focus. Optional secondary pink actions use ink labels. Disabled controls remain readable, with secondary text on blush; the header saved-finds heart remains an active link to `/wishlist` even when empty or browser storage is unavailable. Its count appears only when greater than zero.

Text links are berry and visibly underlined. Navigation/title hover underlines retain the center-growing animation and independent focus ring. Focus uses 3px ink with approximately 3px offset. Navigation CTAs (Explore the Reviews, Learn More, Read the review, Browse My Closet and About links) end with the shared 24px ArrowIcon. On hover only the arrow translates 4px over 180ms; reduced motion disables it. External shopping/closet/gift-list CTAs use the shared 24px ExternalLinkIcon without the forward-arrow animation. Submissions, search/reset/clear controls and dialog-opening Request a Review buttons have no directional icon. Icons are decorative, hidden from assistive technology, and placed after the label with 8px spacing. Keep ordinary navigation, image links and social icons free of extra CTA arrows.

Fields use visible labels, white surfaces, small rectangular corners, secondary placeholders and control borders. Newsletter/search bars preserve joined pill geometry. Focusing either half shows a continuous outer focus ring across the input and button, with no internal focus edge at the join. Labels and validation feedback stay outside the ring; keyboard-focused submit buttons are also underlined. Stacked lead-modal controls retain individual focus rings. Email format feedback has a green tick or subtle red boundary plus accessible explanation; it does not claim delivery or that an address exists. Keep server validation, honeypots, pending/error states and provider-confirmed acceptance. Never show successful signup without real acceptance.

Site modals share white surfaces, 8px panel corners, dark backdrops, serif headings and 44px close controls. The request dialog is limited to 660px: item/link, fit notes, name/email side by side (stacked below 480px), expectation copy and a full-width berry submit button. The configured review wishlist appears in a blush panel below. Lead/filter dialogs retain their functional content layouts. Preserve focus boundaries, Escape dismissal, outside-click dismissal where supported, and focus restoration.

## Hero

Public pages reuse `EditorialHero` with page-specific text and optional photos, CTA and disclaimer. The homepage supplies its own CurtainReveal media; interior pages retain the shared collage below. The shared photo collage uses overlapping straight photo frames with 7px warm-white (#FFFDFA) borders and soft warm shadows. There are no measuring-tape decorations, photo tilts, captions, torn paper, adhesive tape, or AI labels. The homepage preserves “Big opinions. Questionable sizing.”, the size 16–18 introduction and “Explore the Reviews” linking to `/reviews`. “Questionable” alone uses the script accent in the primary berry color, without a background highlight or highlight-reveal animation; “sizing.” stays serif. Shared hero emphasis uses the primary text color with no colored backing. Other headlines use plain serif or optional editorial emphasis.

Site settings → My Closet editorial hero and Curated Finds editorial hero let each shop section choose the default two-photo portrait collage or a single landscape image. Add both portrait images for a custom collage, or leave both blank to use the existing photo pool. Landscape requires one uploaded image with alt text. The wide frame keeps the image's natural aspect ratio and the hero grows to fit its height; the copy stays vertically centered on desktop and stacks above the image on mobile.

The reusable local image pool remains in `public/img/hero/`, cached for five minutes per page identity so filter changes do not reshuffle it. Homepage Sanity outfit/detail overrides take precedence. Publish owned, suitable photos in Studio; pool images are decorative project imagery and are not evidence of a review. Empty pools display neutral placeholders. Supported formats are JPEG, PNG, WebP and AVIF; deployments trace these assets.

Entrance animation is progressive enhancement: coordinated brief fades/upward movement with no rotation, bouncing, replay on ordinary rerenders or loops. Below 768px use a 300ms fade. Reduced motion and JavaScript-disabled browsing show a complete static hero immediately. Main images load eagerly; observers and animations clean up on unmount. Focus cancels unfinished entrance animation so the CTA is immediately usable.

## Default review preview

`ReviewPreview` is the shared component for the homepage, reviews archive, blog cards and related reviews:

1. Borderless 4:5 photograph with carousel dots centered 10px from the bottom, matching shopping cards.
2. Brand above the title when supplied, using the same small uppercase primary-color styling as shopping cards. Omit empty brands; no category is displayed above the image.
3. Large serif title beneath the photograph and brand, with natural wrapping and no background highlight.
4. Real excerpt, then actual size-tried metadata when supplied.
5. Underlined berry “Read the review →” with a descriptive accessible name.

No enclosing card panel, fixed title heights, drop shadow or rounded photo. Titles wrap and grow naturally. Review titles render as plain text without colored highlights or mark elements. Existing titleHighlight content is retained but not applied. Never inject HTML into titles.

Image-carousel controls remain independent and keyboard accessible. Title and reading links remain real links. Product cards retain their product metadata and wishlist hearts. The primary “View item” button links to the product detail page, where marketplace purchase actions remain available. Card descriptions display at most three lines with an ellipsis when clipped; full descriptions remain on detail pages. Unavailable closet-link placeholder text is hidden; configured closet profile links remain available. Cards share typography and spacing without adopting review claims.

## Homepage order and sections

1. Existing approved logo/navigation, request action and saved-finds heart; socials tab.
2. Homepage dressing-room curtain hero; existing headline, introduction and review CTA.
3. Latest Verdicts: up to the three newest published reviews, independently of archive search. No homepage search input. Keep the archive CTA. When empty, use a compact warm-cream panel: Coming soon / Real try-ons are on their way. / Honest fit notes. No sugarcoating.
4. Small typographic “On my review checklist”: 01 Fit, 02 Fabric, 03 Comfort. Berry numbers, dark text. These are planned criteria, not completed tests or statistics.
5. About introduction: preserve the copy, straight photograph, “Size 16–18. Zero sugarcoating.” and `/about` link.
6. Meet Shannequin, immediately before the wishlist banner (any configured homepage video remains before Shannequin).
7. “Your Wishlist. My Fitting Room.”: clean blush split panel, straight clothing photo, working request-modal action and CMS overrides.
8. Existing footer, newsletter, links and required disclosures.

The socials tab uses configured profiles and accessible 44px targets. At 1280px and wider it is a left-side rail. From 1024–1279px the same links become a compact **in-flow** horizontal treatment. Below 1024px, the tab is hidden and the configured social icons appear inside the mobile navigation dropdown beneath its saved-finds / Request a Review row. The mobile-only links are hidden on desktop and remain keyboard accessible when the menu is open. Preserve the existing logo; do not substitute an illustrative screenshot wordmark.

## Shannequin and empty states

Homepage Shannequin copy is exactly the supplied facts: a full-body size-18 mannequin offers another look at how a piece hangs when it fits more like an 18 than a 16. She does not assess comfort or movement, and no measurements are invented. Use “My size-18 sidekick”, “Meet Shannequin”, the supplied body and optional “She brings the curves. I bring the commentary.” accent. CTA links to `/about#shannequin`, whose destination heading exists and has scroll clearance.

The pink rectangular backing and large berry “18” are persistent decorative layers behind the photograph, including after an image is published. Use a transparent PNG/WebP cutout to reveal these layers through the silhouette; opaque photographs keep their own background. These layers are hidden from assistive technology.

`aboutPage.shannequinImage` is the single image source for both introductions; editors do not maintain duplicate image fields. No approved mannequin asset was found during implementation. Development shows an explicitly identified placeholder; production shows a neutral photograph-coming-soon treatment until an image is published. Do not fabricate a mannequin photograph from the reference.

Preserve useful existing wishlist/reviews empty illustrations, helpful copy and reset actions. No fake reviews appear to fill grids. Saved IDs unavailable in the current catalog remain clearable. Empty states use the shared serif/berry styling, not scrapbook clusters.

## Preserved workflows, SEO and accessibility

Keep Next.js App Router, strict TypeScript, Tailwind 4 and official next-sanity. Authenticated Studio, Inventory/pricing tools and draft/publish workflows remain separate from public styling. Never expose read/write/provider credentials. Do not migrate data or republish documents as part of a visual change.

Preserve search/filter/sort/pagination over the full matching dataset, URL state, back/forward, enhanced navigation without page jumps and reduced-motion result transitions. Archive search and shopping remain distinct. Browser wishlists retain storage error handling, cross-tab synchronization, independent heart actions and unavailable-ID cleanup. They never reserve items or require accounts.

Keep closet/Curated Finds classification, Vinted/retailer destinations, affiliate disclosures and personal-experience labels. Sold items retain reviews. Listing price stays separate from price when reviewed. “Sale” requires a real discount; no Win/Fail/Mixed badges, cart, checkout or Vinted synchronization.

Public reviews/posts require published slugs and dates not in the future. Draft previews remain authenticated and noindex; Studio stays outside public navigation. Preserve canonical URLs, metadata, truthful structured data, sitemap and noindex rules for searches/filters. Content remains server-rendered. Keep the existing five-minute content-refresh strategy. Isolated development fixtures remain disabled in production by default. Integrations/importing/deployment are documented in README and `docs/`.

Target WCAG 2.2 AA: semantic landmarks, skip link, logical headings, visible labels, alt descriptions, usable keyboard order and unobscured focus. Verify rest/hover/active/focus/error contrast, 320px reflow, 200%/400% zoom, natural title wrapping and script clearance. Keep content available without JavaScript; respect reduced motion. A labeled wishlist table region may scroll internally. Automated scans supplement keyboard/layout checks; they do not establish complete compliance. Provider delivery, authored descriptions and video accessibility still need editorial review.

## Retired styles

Chunky Onest display headings, turquoise actions, bright-pink primary buttons with black labels, Polaroids, photo captions, handwritten UI, torn-paper heroes/sections, adhesive tape/doodles/hearts, photo tilt, floating quotes, bell-curve/statistical graphics and homepage review search must not return. Hearts are reserved for visitor wishlist controls. Historical assets/dependencies remain available for archived references and are not destructively deleted.

## Shopping image specification

The Shop archive shows two photographic destinations, My Closet and Curated Finds. The current destination uses a burgundy bottom border and checkmark; both links retain visible keyboard focus and responsive hover/press feedback. Search leads the cream filter bar, filters wrap on narrow screens, and the sort control has a visible “Sort by” label. The result count gains a “Clear filters” link only when a search, filter, or non-default sort is active. On phones, destination cards stack and filter controls use two columns.

Shopping cards and product detail photographs use **4:5 portrait**, with 1080 × 1350 CDN requests and responsive Next.js delivery. Wishlist thumbnails retain 4:5. Studio product Photos have crop/hotspot controls with a named **Product card — 4:5 portrait** preview; saved crop/hotspot values are honored by the frontend. The source upload is preserved. Crop dimensions below 800 × 1000 produce a nonblocking warning; 1080 × 1350 is recommended. Asset-size validation blocks publishing photographs over 20 MB, after upload; this is not a custom upload-time size gate. Existing smaller photos remain editable/publishable with a warning and are not migrated.

JPEG and PNG are recommended. WebP remains supported for existing optimized photography; the picker also accepts HEIC/HEIF, which Sanity supports as uploads in the HEIF family. HEIC conversion/rendering depends on the asset pipeline; export to JPEG/PNG if needed before upload. No browser HEIC decoder or automatic client conversion was added. Review previews keep their own 4:5 specification; full-body Shannequin images retain the uncropped full-asset behavior.

## Closet marketplaces and shop links

“My Closet” contains owned resale items sold through Vinted. Cards, details and saved items link to the configured Vinted profile; individual purchase buttons use Vinted listing URLs. Inventory and pricing tools retain asking prices.

### Studio master inventory CSV import

Inventory includes a Sanity UI master inventory import dialog with CSV, currency and photo-file controls, a preview table and confirmation. It reads SKU, STATUS, NAME, DESCRIPTION, BRAND, SIZE, IMAGES and VINTED, plus optional URL, CATEGORY and CONDITION. Product imports create or update drafts only; a filled URL sets the Vinted item link. Blank optional cells preserve existing fields.

Inventory rows show explicit Draft/Published text and a contextual Publish/Set to Draft action. Sanity UI confirmation dialogs explain the public effect and preserve keyboard focus; actions disable during saves and announce the confirmed result. Publish runs schema validation; Set to Draft unpublishes while retaining editable content.

Inventory price cells show per-marketplace master prices when present. The main asking price and inventory value continue to use the selected primary marketplace, counting each SKU once. Both listing URL fields are available in the product editor. The master importer changes no public shop layouts or purchase-button behavior.

Product card photography uses the shared ImageCarousel: the main photo plus at most four additional photos (five total), in Studio gallery order. Dots use at least 24px targets, pressed states and descriptive labels. Native horizontal swipe, Left/Right and Home/End navigation from either the image area or a photo dot, visible inset focus rings, active-image announcements and reduced-motion scrolling are supported. Each active photo links to the item detail page; the wishlist heart and photo controls act independently. No autoplay. Cards retain the 4:5 crop and reserved dimensions; item details retain the full gallery.

Custom native-select chevrons apply only to public `select.filter-control` elements. Sanity UI supplies Studio select arrows, spacing and appearance; public dropdown backgrounds must not add another arrow inside Studio.

## Review detail editorial layout

`ReviewArticle` renders review documents independently of the generic blog article. It follows the approved October 15 reference: restrained editorial kicker/rule, category, large Lora headline with an optional berry Dancing Script ending, publication date/byline, and an outlined size-worn pill. The main desktop area pairs a portrait media column with four numbered text sections. The fixed section slots are First Impression, Fit / Comfort, Who might like this?, and Final Take; each heading and Portable Text copy is independently editable. Legacy article copy remains visible when structured content is missing. No automatic data migration occurs.

Media uses a featured image, additional images with optional captions, an authorized video, or both. Thumbnails and the optional Watch my try-on overlay are semantic buttons with pressed state, labels and visible focus. Switching media pauses any video, never autoplays, and announces the current selection. Video keeps native controls, captions and an optional transcript. The no-JavaScript view displays every media item. Mobile stacks the media above the numbered sections; headings and copy reflow naturally.

The optional Shannequin quote panel has a blush background, a pink rectangle behind the shared full-body image, script eyebrow, serif quote and Meet Shannequin link. Decorative quotation marks are oversized (2.2em) and light pink #F5C1CB, with a hanging opening mark and an inline closing mark; the quote, attribution and link align within a shared inset. It uses Homepage’s existing shannequinImage for every review, preserves the full asset, and has no oversized decorative number. The per-review quote is authored; no quote is invented. The panel is omitted when no quote is entered. An optional selected product CTA below the review accepts either a closet item or Curated Find and links to its detail page; it never implies purchase availability. Related reviews retain their existing relationships and cards. Site header, footer, public shop behavior, draft boundaries and existing routes remain intact.

The shared `RequestBanner` is used by the homepage and About page and can be reused as `<RequestBanner />` with default copy or `<RequestBanner content={content} />` for existing CMS title/intro overrides. It always uses the local `/img/closet.jpg` photograph (900 × 601), optimized with responsive Next.js Image and available in production. Its heading IDs are unique per instance; the CTA opens the existing Request a Review dialog. The original requestImage content remains stored but is no longer used by this banner.

The responsive grid reserves photo dimensions and room for the lower frame. The border and main shadow use 0 3px 8px rgb(64 39 30 / 6%), 0 14px 28px -8px rgb(64 39 30 / 18%); the smaller photo uses 0 4px 10px rgb(64 39 30 / 8%), 0 20px 36px -12px rgb(64 39 30 / 24%).

## About-page Shannequin measurements

The About section keeps its existing introduction and script tagline, with the uncropped headless mannequin on the right and a blush rectangle behind it. Omit the decorative 18 on About only. Six stable measurement keys (chest, waist, hips, arm, wrist, inseam) live in About page → Shannequin measurements. Each stores a label, one positive source value, its source unit (in/cm), and a short description; clarify arm length versus upper-arm circumference. Never seed real content with example values. Missing or invalid values say “Measurement coming soon.” Convert with 2.54 cm/in, display one decimal at most, and remove trailing zeros.

Hotspots share percentage coordinates relative to the actual full image bounds. Keep that image uncropped at its natural ratio with no letterboxing. Burgundy plus/minus circles have white borders and at least 44px effective targets, subtle static active halos, decorative labels/connectors, and visible keyboard focus. Hover/focus previews one area; click/tap pins it, a second activation closes it. Escape and outside pointer presses dismiss. A short pointer grace period lets users enter the popup without losing it; touch does not trigger hover changes. Warm-white panels use blush borders and warm shadows. Keep floating panels within the figure on desktop; below 1200px use a panel under the mannequin so narrow columns cannot obscure the controls. Reduce movement for reduced motion. A native “View all measurements” disclosure sits below the measurement introduction in the left copy column, remains available without JavaScript, and lists the same data; controls are hidden without JavaScript. Homepage and review mannequin compositions stay unchanged.

## Owner’s review wishlist

`/my-wishlist` is the owner’s selection of Curated Finds to try next; `/wishlist` remains a visitor’s browser-saved items. Use the existing shared hero, product cards, 4:5 media, independent save hearts, carousels, filter bar and product details. Entries are existing Shopping items, never a second product type or resale inventory. Support offers the configured external wishlist and embeds existing catalog wishes; Request a Review links to Support’s My Review Wishlist section; purchases continue on the associated retailer site. Keep “Not yet tried” and optional-gift expectations visible. Fully received items leave My Wishlist while remaining Curated Finds.

Studio’s Review Wishlist tool imports the Amazon CSV into drafts matched by ASIN. Preserve manual edits on re-import, validate before publishing, and confirm destructive actions. New imports ignore Amazon prices, ratings and image URLs; legacy snapshots remain for review and are not displayed. Unverified Amazon thumbnails are retained for review but hidden publicly; use original/licensed Studio photographs with source information. See `docs/REVIEW-WISHLIST.md` for import ownership and publishing steps.

## Amazon editorial and affiliate states

Amazon product imagery must be original or separately licensed with source information; unverified/imported Amazon thumbnails stay hidden, preserving the data for review. No Amazon image proxy, price, stock, discount or customer-rating UI is enabled by CSV import or Associate enrollment. This restriction does not change own resale prices. Product CTA: “View on Amazon.” Ordinary links, active item-level affiliate links and requested-gift links use distinct attribution decisions through the shared resolver. Required identification and clear commission text appear before/near affiliate recommendations; they do not imply final application approval.

Experience labels distinguish personally tested, mannequin-only and curated/not personally tested. Keep seller facts separate from original commentary and do not infer human comfort or durability from Shannequin. Hide empty editorial sections. New Amazon pages stay noindex until useful original commentary, limitations/checks, an editorial date and explicit editor approval/indexing intent are supplied. Query variants remain noindex with clean canonicals. Use the shared cards/hero and preserve the Closet/Curated Finds tabs. See `docs/AMAZON-LAUNCH.md` for source handling, configuration, consent-aware measurement and the owner launch checklist; no legal certification or ranking promise is made.

The My Closet tab includes a blush closet banner with “Great finds. Second chances.”, the local `/img/group2.png` graphic, and the configured Vinted closet link. The layout stacks on mobile; Curated Finds does not display this banner.

## Catalog terminology and states

Navigation: Reviews, Shop, About, Support the Reviews, Saved Items with the existing heart and positive-only count. Logo links home; Contact remains a popup in the footer. Saved Items uses `/wishlist` and existing browser storage. My Review Wishlist is the owner’s gift selection, separate from visitor saves. Cards say “View item”; product details label Amazon and Vinted destinations explicitly. Sold items leave default shopping grids; sold/archived details retain save/review references and omit purchase actions. Reader-provided acknowledgments sit immediately below the review H1; names/custom messages require permission. Keep existing tokens, focus states, responsive layouts and dialog behavior.

## Homepage curtain reveal

At widths of 1000px and above, the homepage hero uses a wider 1360px container and a 1:1.35 copy/media column split. From 768px upward, the curtain scene also compensates for PNG padding with 118% width and a centered negative margin. At 768–999px the composition follows the copy with a 680px media column. This keeps the feature visibly larger in Studio previews as well as full desktop windows. Below 768px the existing contained mobile sizing remains. Photos, fabric and handle always scale together.

The homepage alone uses `CurtainReveal` in the existing two-column hero; interior pages keep their existing collage and entrance behavior. Copy, script accent, CTA, fonts and surrounding sections are preserved. Below 768px the composition follows the copy; both frames stay side by side, with a reserved 1536:1024 scene and no horizontal overflow.

Asset roles: `hero-frames.png` is the supplied 1536 × 1024 transparent frame overlay. Its photo apertures are normalized from original-canvas rectangles (157,119,598,791) and (782,119,598,791). Two independent photos fill those openings with cover sizing. `hero-curtain.png` is the supplied 1024 × 1536 ivory fabric; visible alpha bounds x89…976/y53…1484 are compensated in CSS instead of editing the original file. Keep the PNGs intact. The supplied `hero-pull-handle.png` remains available as a visual reference; the working handle uses HTML/CSS and an inline decorative SVG arrow so it remains sharp, accessible and at least 44 × 44px.

The stationary dark rod sits above the right opening. The curtain starts at 8% reveal, anchored at canvas x1442, and compresses horizontally without shortening as the leading edge travels from x782 to x1386. At 100% the narrow gathered fabric is outside the right photo opening. The handle follows that same edge; the left photo stays visible. A separate Reveal photo / Close curtain button provides the same endpoints.

On the first viewport entry only, wait 600ms, tug fabric and handle 16px right and return within 900ms. Cancel pending/running motion on interaction, keyboard focus, reduced-motion change or a resize during the tug. The tug never changes slider value or dismisses “Pull to reveal.” Keep that live HTML instruction until a visitor changes position. Reduced motion uses immediate controls with no introductory animation. No interaction has easing or lag; no animation dependency is added.

Use pointer capture for mouse, touch and pen; release on completion, cancellation or lost capture. Fabric and handle use grab/grabbing cursors and `touch-action: pan-y` so vertical gestures can scroll. The focusable handle is a horizontal slider with a meaningful name and readable percentage. Arrow keys adjust 5% (Shift: 10%); Home/End select endpoints. Preserve a visible focus ring, decorative asset semantics and meaningful photo alt text.

Studio → Content → Homepage: **Homepage left photo — always visible** (`heroBack`) and **Homepage right photo — curtain reveal** (`heroFront`). These reuse existing stored fields: nothing is overwritten or migrated. Set each photo’s alt description, crop and hotspot; hotspot positions also supply adjustable CSS object-position. Crop whitespace out of source photos when necessary. Publish the Homepage document and allow the normal five-minute content cache to refresh. If either photo is missing, show static frames with the available photo and a neutral placeholder; omit the curtain controls. Without JavaScript both photos remain statically visible. Do not substitute unrelated photos automatically.
