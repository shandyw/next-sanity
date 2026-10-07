---
version: alpha
name: CurvyGirlReviews
description: A warm, photo-led fashion review site with bold type, handwritten accents, and turquoise details.
colors:
  primary: "#35E0DE"
  primary-ink: "#06302E"
  primary-deep: "#00706F"
  tertiary: "#F5417B"
  highlight: "#FFE86B"
  neutral: "#FCFAF7"
  surface: "#FFFFFF"
  on-surface: "#0C0D10"
  text-secondary: "#4A505C"
  border: "#E2E0DA"
  border-control: "#6F7885"
  error: "#B4233F"
  focus: "#00706F"
  transparent: "transparent"
typography:
  display:
    fontFamily: Onest
    fontSize: 76px
    fontWeight: 900
    lineHeight: 0.98
  body:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
  handwritten:
    fontFamily: Caveat
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.1
rounded:
  none: 0px
  sm: 2px
  md: 8px
  lg: 18px
  xl: 24px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px
  section-compact: 28px
  page-desktop: 48px
  page-tablet: 32px
  page-mobile: 20px
  content-max: 1344px
  grid-gutter: 20px
  control-height: 52px
components:
  button-accent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.full}"
    height: "{spacing.control-height}"
  review-card:
    backgroundColor: "{colors.transparent}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
  review-image:
    rounded: "{rounded.none}"
  sale-badge:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
  request-banner:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    style: torn paper with turquoise tape details
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
---

# CurvyGirlReviews Design System

## Overview

The approved reference is the visual source of truth for this implementation. Keep the page warm, confident, editorial, and easy to scan. Real HTML text and controls sit over a warm-white canvas; photos, large expressive sans-serif headlines, brush-stroke highlights, small hearts, drawn arrows, and handwritten notes provide personality. The reference image is not used as a page background.

The repository is a static HTML/CSS/JavaScript site. No request service, newsletter provider, or review CMS is configured. Form inputs validate locally and explain that nothing was submitted. The homepage's “The Latest Verdicts” is independent from search and displays up to three available collection records. Publication dates are absent, so the supplied source order is retained; the page does not claim a verified date-based ranking or invent dates. Homepage search navigates to `/reviews/`, where query, supported filters, sorting, and pagination are encoded in the URL and operate over the full local review collection. Sample data and remote Unsplash imagery are illustrative placeholders; the available photos are not the exact approved mockup photos and do not depict the reviewer. Replace them with owned/editorial assets before presenting them as personal try-ons or verified reviews.

## Colors

| Token | Value | Role |
| --- | --- | --- |
| `neutral` | `#FCFAF7` | Warm-white background used throughout the page |
| `surface` | `#FFFFFF` | Paper banner, form controls, and dialog |
| `on-surface` | `#0C0D10` | Headlines, body text, and icons |
| `text-secondary` | `#4A505C` | Supporting copy and metadata |
| `primary` | `#35E0DE` | Turquoise buttons, active filters, doodle strokes, and tape |
| `primary-ink` | `#06302E` | Dark text on turquoise controls |
| `primary-deep` | `#00706F` | Focus indicator and accessible accent links |
| `highlight` | `#FFE86B` | Hand-drawn underline and small yellow accents |
| `tertiary` | `#F5417B` | Small heart and restrained pink details |
| `border-control` | `#6F7885` | Input boundaries where needed for recognition |
| `error` | `#B4233F` | Validation errors |

Keep dark text on turquoise and yellow. Pink and yellow are decorative, not the only signals for meaning. Turquoise text on warm white is not used for small copy. The page background remains warm white; do not add pale-turquoise section backgrounds or black sections.

## Typography

Load **Onest** at weight 900 for expressive, heavy headlines; keep **Manrope** for body copy, navigation, controls, and review text; and use **Caveat** for handwritten annotations. Provide sans-serif and cursive fallbacks. Headlines are bold and direct; body copy remains calm and comfortably readable. UI copy stays as selectable HTML text.

| Role | Size / line height | Weight | Application |
| --- | --- | --- | --- |
| Display | 48–76px / 0.98 | 900 | Hero headline |
| Section heading | 36–58px / 0.98 | 900 | Reviews and major sections |
| About heading | 32–48px / 0.98 | 900 | Short About section |
| Card title | 24–30px / 0.98 | 900 | Review title |
| Body | 16px / 1.65 | 400 | Main copy and form controls |
| Card copy | 15px / 1.4 | 400 | Compact review description |
| Handwritten note | 17–22px / 1.1 | 600 | Collage notes, CTA annotation, and doodles |

Headlines use `font-family: 'Onest', sans-serif`, weight 900, `-0.05em` letter spacing, and `0.98` line height. Body copy remains Manrope. On mobile, hero text is 42–58px and section headings are about 34px. Let headings and product titles wrap rather than clip.

## Spacing and Layout

The content maximum is 1344px, with 48px desktop, 32px tablet, and 20px mobile page insets. Use an 8px spacing rhythm with a 4px micro-step. The reference is compact: the hero leads directly to search; card imagery and headings stay close; About and the request banner use modest vertical gaps. Avoid tall empty image frames and excessive whitespace. Keep major headings on one line when the available width permits, then allow natural wrapping on small screens or when needed to prevent overflow.

| Region | Composition |
| --- | --- |
| Header | Wordmark, Reviews/About/My Faves links, turquoise request button; collapsible menu when space is constrained |
| Hero | Bold stacked headline and short lede on the left; two overlapping, rotated photo prints on the right |
| Homepage search | A search field and submit button that open the dedicated `/reviews` collection; no category buttons or filters on the homepage |
| Latest reviews | Independent “The Latest Verdicts” section; always displays up to three newest available review records and has a View All Reviews link |
| Reviews page | Compact “The Reviews” introduction, search followed by category toggle buttons and data-supported filters, active chips, newest/available price sorting, responsive card grid, and 12-item pagination |
| About | One short paragraph alongside a wide photo; stacks on smaller screens |
| Request CTA | White irregular paper strip, copy and action on the left, small hand-drawn detail on the right, turquoise tape at opposing corners |
| Footer | Light, compact wordmark, newsletter field, social links, and legal/contact links |

Review images use approximately 1.12:1 proportions on desktop and 1.18:1 on mobile. The About image uses approximately 1.3:1. Hero prints use portrait 4:5 imagery, white borders, gentle shadows, and slight opposing rotations. Reserve these ratios to reduce layout shifts; keep clothing and faces visible in crops. Only content is allowed to scroll horizontally when needed; avoid page-level horizontal overflow.

## Photo Collage and Handwritten Accents

The hero collage contains two semantic `figure` elements with real `img` elements. The back print rotates about -3.5 degrees and the front print about +2.5 degrees. A small yellow “THE FIT CHECK” note sits on the front print. Set “But can / I sit in it?” in black Caveat on a small, tilted, irregular white paper scrap with a soft shadow near the lower photo edge. Place a thin, hand-drawn curved arrow in the open space beside the print, pointing back toward the photo. Keep turquoise motion strokes and a small heart as supporting details. On narrow screens, shift the back print enough to preserve white space for the arrow and note; do not clip the annotation.

Use Caveat sparingly for annotations, never for essential controls or long body copy. Make visual accents look hand-drawn: use uneven polygon silhouettes, variable curved SVG strokes, rounded stroke ends, and slight rotation rather than flat rectangular bars or text-glyph arrows. The hero underline, sparks, arrows, small heart marks, and turquoise tape all use drawn shapes. Mark purely decorative elements `aria-hidden="true"`. Alt text must identify placeholder photography honestly; do not imply that an unowned stock model is the reviewer.

## Reviews Discovery

The homepage's latest section does not read homepage search or filter state. It always shows up to three entries from the available review collection. Sort by publication date when every relevant record supplies one; otherwise preserve the existing source order and do not create synthetic dates or claim verified chronology.

Use `/reviews` for browsing and searching the complete available review collection. The compact introduction is “The Reviews” with “Real try-ons. Honest opinions. Find your next yes.” The search field comes first, followed immediately by category toggle buttons and only data-supported Brand, Size tried, reviewed-item Price-range, Review format (Video/Written checkboxes; neither selected means all), Sale, and Available on Vinted controls. Homepage search submits to `/reviews?q=...`; empty or whitespace-only submissions show “Enter a search term.” and keep the current page. No category/filter buttons appear on the homepage. Its “The Latest Verdicts” grid never reads search state. Query parameters represent `q`, repeated `category`, supported repeated `brand` and `size`, `min_price`/`max_price`, supported repeated `format`, `vinted=1` when tracked, `sale=1` when on-sale data exists, `sort`, and `page`. Search is trimmed and URL encoded. Search and each distinct filter group combine with AND; multiple selections within one group combine with OR. Changing query, filters, or sort resets page to one. Clearing filters keeps the query and selected sort. Default newest/page-one values are omitted from generated URLs; the clean archive stays `/reviews/`. Detail links and the Reviews breadcrumb retain the originating page and filters. There is no separate Back to reviews link. Unknown review IDs show a Review not found state. Browser history and direct links restore the same state.

Render filter groups only when the review data supports them. Current records contain category, title, blurb, and images only, so Brand, Size tried, reviewed-item Price, Review format, Available on Vinted, and Sale controls are omitted. No relevance scoring or publication timestamps are supplied; newest-first preserves source order until dates exist. A visible note explicitly explains that chronology cannot yet be verified. Most Viewed is absent because view counts are unavailable. Category toggles stay directly below search at every width. Below 900px, the Filters button opens a native dialog with draft selections; Show results commits one URL/history update, while close/Escape discards changes. Tab and Shift+Tab stay within the dialog, and closing returns focus to its trigger. Category and attribute changes preserve control focus; chip removal returns focus to search when the removed chip no longer exists. Pagination is 12 reviews per page and is shown only when result count exceeds that size. Current cards link to a data-backed detail state on `/reviews/?review=id`; the source has only short blurbs and photos, not full review articles, so complete editorial detail pages depend on future CMS content.

## Review Cards and Filters

Review cards are unframed and compact: image, bold linked title, supported brand/size metadata, short description, optional reviewed price, and a View Review CTA by default, or Read Review / Watch Review when format data supports it. Cards do not display Vinted links. The product detail page alone displays a Buy Now On Vinted button when a real `vintedUrl` exists. The image and title lead to the review detail URL. Keep dimensions reserved, use compact 1.08:1 archive image crops, lazy-load below-fold images, and provide keyboard-visible focus states.

**Sale is the only permitted review-card badge.** Render the “Sale” badge only when the item has an explicit `onSale: true` flag and a sale price. Do not add or style Win, Fail, or Mixed badges or verdict pills. Do not use verdict language as a decorative label on images.

Keep category options derived from the available review records. Search matches title, description, category, and any supplied brand or size metadata. Add Brand, Size tried, reviewed-item Price, or Sale controls only when those values exist in the collection. Never infer product price from sale copy. Keep active selection exposed to assistive technology. The present local sample has no publication dates, brand, tried-size, or reviewed-price values, and no explicitly on-sale review; the page therefore offers category filtering only and retains source order for “Newest first.”

## Request Banner and Forms

The request banner copy is “Your Wishlist. My Fitting Room.”, “Eyeing something? Send it my way.”, and “Request a Review.” It is a broad white strip with an irregular torn-paper edge, turquoise tape details, dark text, and a turquoise pill button with dark text. Use `img/torn.png` as the paper background, scaled so its visible alpha bounds fill the banner. Place a fitting-room clothes-rack photograph flush to the paper's right edge and full paper height at every width; use the same PNG as its alpha mask so the photo's top and bottom edges match the paper exactly. Narrow the image rail on phones and preserve a readable text column on the left. Keep the banner and its ancestors overflow-visible so turquoise tape can extend beyond the top paper edge. Do not add line art or handwritten accent text beside the photo. The About content stays brief, and the banner follows it without a divider line.

The request dialog retains labeled name, email, product, and notes fields, inline validation, focus containment, Escape-to-close, and focus restoration. The newsletter field retains native email validation. Neither form may report a successful submission, clear values as if sent, or imply delivery until a service is configured. Current status copy explicitly tells users that nothing was sent/submitted. Do not connect a third-party endpoint without configuration.

## Accessibility and SEO

Use semantic landmarks, one primary heading per page state, explicit form labels, visible focus indicators, and controls operable by keyboard. The archive result count uses a polite live region. Mobile category and metadata filters use a native dialog with initial focus and focus restoration; Escape closes the dialog. Respect reduced motion, text enlargement, and narrow-screen reflow. Treat empty-alt carousel images as decorative only when the adjacent linked review title provides the same essential information. Do not claim WCAG 2.2 AA compliance without a manual keyboard/contrast/reflow review plus automated checks. Prerecorded video requires captions and a transcript before publication.

The homepage and clean `/reviews/` archive have unique titles, descriptions, canonicals, and Open Graph/Twitter metadata. Search, filter, pagination, sort, and review-detail query URLs are marked `noindex,follow` by the archive controller and canonicalize to the archive root; keep query URLs crawlable so crawlers can see the noindex directive. The clean homepage, archive, My Faves, and About page are in the sitemap template. Curated category archives can be made indexable once they have unique useful content and stable paths. Structured data is intentionally omitted until review records and the public origin support accurate markup; never invent ratings, prices, availability, or testimonials.

`robots.txt` and `sitemap.xml` are templates. Replace `https://your-public-site.example` in both with the actual production origin before deployment; the production hostname has not been supplied. The archive currently loads from local static review data; replace `reviews-data.js` with the CMS/API collection integration when available, retaining the same fields and URL-state contract. Search currently covers all records loaded into that local collection synchronously.

## Responsive and Accessible Behavior

| Width | Layout |
| --- | --- |
| 900px and above | Three review columns and desktop archive attribute controls; full navigation and two-column hero/About at their existing wider breakpoints |
| 600–899px | Stacked hero and About; two review columns; compact navigation; mobile archive filter dialog |
| Below 600px | 20px page inset; stacked content; one review column; compact collage and expandable archive filters |

Preserve DOM reading order when columns stack. Navigation, filters, dialogs, links, and forms must work with keyboard alone. Keep focus outlines visible, maintain at least 44px targets for interactive controls, use semantic headings and landmarks, and label every form control. Honor reduced-motion preferences. Do not put essential meaning in color, animation, or handwritten lettering.

## Project Accessibility and SEO

Use a skip link, semantic header/nav/main/footer landmarks, one primary heading for each page state, visible focus rings, labeled search/filter/form controls, and empty alt text only for decorative imagery. The archive result count is announced politely; the mobile filter dialog focuses a control on open, supports native Escape dismissal, and restores focus to its trigger. Search, category toggles, clear actions, sort, pagination, and card links must remain keyboard operable. Reduced-motion preferences disable smooth scrolling and nonessential motion. Keep text reflowing without horizontal page overflow at narrow widths and browser zoom. Review contrast and conduct manual keyboard checks as part of release; do not claim WCAG 2.2 AA compliance from automated checks alone.

The homepage and clean archive have distinct titles, descriptions, canonical paths, and social-sharing titles/descriptions/images. Search, filter, price-sort, pagination, and query-detail URLs receive `noindex,follow` while remaining crawlable so search engines can read that directive. Canonical points at the clean archive. The sitemap includes the homepage, clean archive, `/my-faves/`, and `/about/`; do not include query variants. The repository has no configured production hostname: replace `your-public-site.example` in `robots.txt` and `sitemap.xml` and replace relative canonical/share paths with the deployed origin before launch. No review structured data is emitted because ratings, verified prices, availability, publication dates, and full review articles are not supplied.

This is currently a static prototype. `reviews-data.js` is the local collection source, `review-cards.js` owns shared cards, and `reviews.js` filters the full loaded array and synchronizes URL state. A CMS/API can replace that collection later while preserving these fields and parameters. Current sample data has three category/title/blurb/image records only: no publication dates (so “Newest” retains source order), brand, size tried, reviewed price, format, Vinted availability, sale status, view counts, or full article bodies. Optional controls and claims must stay absent until those fields become real data. Query/detail URLs use `?review=id` because this static project has no clean dynamic detail-route hosting.

## Do's and Don'ts

**Do**

- Keep the warm-white page, expressive sans-serif type, turquoise buttons, yellow highlights, and restrained pink hearts.
- Use compact, correctly cropped fashion photos and label unavailable personal imagery as placeholder content.
- Keep the hero prints overlapping and slightly rotated, with HTML annotations and light CSS/SVG decoration.
- Keep the homepage latest section independent from collection search and filters.
- Keep homepage discovery to a search field and submit button; category controls live on `/reviews`.
- Let homepage search open `/reviews?q=...`; empty or whitespace-only submissions show a validation error.
- Show a Sale badge only for explicitly on-sale items.
- Explain that forms are not connected until a real service is configured.

**Don't**

- Add pale turquoise section backgrounds, black sections, or horizontal divider lines.
- Add Win, Fail, or Mixed badges or any verdict badge styling.
- Use tall review image containers that create excess blank space.
- Present placeholder stock photography, review copy, or sample prices as verified personal content.
- Embed the mockup image as the page or rasterize interface text.
- Claim that a request or newsletter signup succeeded without a configured endpoint.

## Verification and deployment limitations (2026-10-01)

The local static server serves `/`, `/reviews/`, and `/about/`; slashless directory routes redirect to their trailing-slash equivalents. `/about/` is now a dedicated, indexable About page with its own canonical and social metadata. There is no dynamic article route: `?review=id` displays only the supplied blurb, category, and illustrative photos. It does not invent an article, rating, date, price, or availability. `site.js` keeps the latest three published records independent of homepage URL parameters; both grids use `review-cards.js`. The unused legacy `script.js` is not loaded and was not rewritten.

Checks use Chromium at desktop 1440px, tablet 820px, and mobile 390px, with search submission (including empty and encoded queries), direct URLs, category OR/search AND behavior, chips, query-preserving clear actions, empty results, back/forward, detail metadata, sliders, and mobile apply/cancel/Escape/focus checks. HTML validation covers home, archive, and the About page; JavaScript syntax checks cover the loaded scripts. Additional 320px checks cover homepage, archive, detail, missing-detail and empty states; the shared newsletter field now shrinks without horizontal page overflow. Axe reported no violations in the checked archive sizes, 320px page states, request dialog, or filter dialog. Normal and reduced-motion slider keyboard behavior were exercised. Automated axe checks are supporting evidence, not WCAG 2.2 AA certification or a substitute for screen-reader and cross-browser review.

The real collection has only three records. Pagination is therefore hidden, and real multi-page browsing cannot be demonstrated. Temporary browser-only fixtures exercised 12-per-page slicing, page-two detail/back links, page reset and clamping, AND across attribute groups, OR within category/brand/size/format groups, numeric price ordering with unknown prices last, and chronological latest selection when dates exist. Those fixtures are not shipped and do not add any product facts to `reviews-data.js`. A Vinted URL alone does not establish availability; the availability filter requires an explicit `availableOnVinted: true` value. Missing/blank prices never become zero. Currency support still needs an explicit CMS contract before importing real price data; the existing optional price UI assumes dollars.

All nonempty query strings receive `noindex,follow`, including explicit default sort/page values, unsupported parameters, and missing review IDs. Archive title, description, and Open Graph/Twitter text track search/detail state in JavaScript; canonicals remain the clean archive. A small head script sets query noindex before the archive controller executes. On a purely static host, crawlers that do not execute JavaScript still receive the base archive metadata. Configure query-aware `X-Robots-Tag` headers or server-rendered metadata at deployment if non-JavaScript crawler coverage is required; social previews of query details similarly need server-rendered metadata. Do not block query crawling in robots.txt.

The production hostname is still unknown. Preserve `https://your-public-site.example` in robots.txt/sitemap.xml until deployment and then replace it with the real origin; canonical/share paths and images should become absolute production URLs at that time. The sitemap contains home, the clean archive, My Faves, and About. No unsupported review/rating schema is emitted. Existing generic social/Vinted destinations and Privacy/Contact placeholders still need real account/legal/contact destinations. Request and newsletter forms remain local validation only, explicitly reporting that nothing was sent; they require configured services before launch. No provider or production hostname was invented.

Both homepage and archive search use the newsletter-style joined input and turquoise button, including on mobile. Search inputs are required; native validation rejects empty and whitespace-only submissions and clears the error when the user types a search term. Use View All Reviews or the Reviews navigation link to browse the unfiltered collection. This supersedes the earlier empty-search navigation behavior.

## Review detail layout

The detail state follows the earlier detail-page brief and `temp/ref.png` while retaining the site typography, warm-white canvas, and turquoise controls. The top row has equal text/gallery columns, stacking below 768px. Text includes a Reviews/category breadcrumb, product heading, review heading and copy, and a Vinted CTA only when a real URL is provided. The gallery has one large image and keyboard-operable thumbnail buttons with pressed state and announced selection. A second row contains “Should You buy it?” with YES/No guidance columns; the final row shows up to three other published reviews using shared cards, prioritizing the same category and excluding the current review.

Optional editorial fields: `productTitle`, `reviewTitle`, `reviewCopy` (text or paragraph array), `buyIf` and `skipIf` (text arrays), and `vintedPriceLabel` (verified current listing price including currency), alongside `vintedUrl`. Existing records retain their title/blurb fallback and two related cards. Missing buying guidance and shopping links are identified plainly; no product names, recommendations, listing URLs, or $12 prices are invented. The current `changes.md` is user-owned and may contain newer page briefs.

Product information below the detail title uses a labeled definition list: Brand (`brand`), Size (`sizeTried`, shared with archive filtering), and Color (`color`). Empty values are omitted. Each sample record exposes these editable fields plus `vintedUrl`; a populated listing URL powers the existing Buy Now On Vinted button. Unknown values remain empty rather than inferred from photographs.

## Dedicated About page

`/about/` follows the composition in `temp/about.png` and the current homepage branding. The intro is a balanced text/photo grid at desktop widths, stacking below 900px in heading → copy → actions → photo order. The requested Shandy copy is real HTML. Onest 900, Manrope, Caveat, existing color tokens, container widths, and pill buttons are reused. A white photo border, light shadow, small rotation, yellow “Keeping it real.” note, handwritten “Real body. Real opinions.” annotation, and decorative hearts use separate HTML/CSS and existing SVG assets. The compact square photo reserves 680×680 dimensions, requests a resized image, loads eagerly, and has high fetch priority. It is the existing stock jeans photograph, visibly captioned “Placeholder photo — not Shandy.” A verified owned portrait is still required; the generated reference portrait is not used.

“What you’ll find here” uses three unboxed columns, stacking below 600px. Meaningful numbers use the dark turquoise token rather than bright turquoise. The page reuses the current homepage header, newsletter footer, torn-paper request-banner markup, rack photograph, and request dialog; all behavior remains in `site.js`. Because there is no template/build system, shared markup is repeated in the static HTML and must be kept in sync. About-only CSS is scoped with `about-page` classes. The homepage composition and user edits are retained; only its About navigation destination changes to `/about/`. The archive About link also points to the new page. Current navigation uses `aria-current="page"` and a pink underline.

About has a unique title/description and matching Open Graph/Twitter metadata, a `/about/` canonical, indexable clean HTML, and a sitemap entry under the existing example-host placeholder. Query variants use the shared noindex head behavior. No production hostname, real social account, or shopping destination was invented: the configured Vinted/social links are preserved. Request and newsletter integrations remain unconfigured and continue to state that nothing was sent/submitted.

Reviewed in Chromium at 1440, 820, 390, and 320px: one H1, heading order, no horizontal overflow, responsive columns, current navigation, internal links, visible placeholder identification, eager image loading, skip-link keyboard focus, request-dialog Tab/Shift+Tab containment and Escape/focus return, form validation, and truthful newsletter/request status. HTML validation and axe checks passed with no reported violations. Measured text contrast against the actual tokens: body 7.77:1, dark turquoise numbers/links 5.68:1, button text 8.75:1, and yellow note text 15.74:1. This is not a claim of WCAG 2.2 AA certification; screen-reader and cross-browser release checks remain appropriate.

A 200% text-enlargement check at tablet width also covers the About content. Handwritten photo annotations remain in normal flow below the image so expanded text cannot obscure the placeholder caption; the top yellow note sizes relative to its text.

## Optional product-page video

A configured `videoUrl` adds a “Watch the review” section after the product information/gallery and before buying guidance. Use a direct MP4/WebM URL or root-relative file path, not a video-provider watch-page URL. Empty or invalid/non-HTTP URLs omit the entire section. Native video controls support keyboard playback, with inline mobile playback, no autoplay, and no preloading. `videoPoster` optionally overrides the first review photograph. `videoCaptionsUrl` supplies an English WebVTT track (same-origin recommended), and `videoTranscript` supplies an expandable plain-text transcript. Publish accurate captions/transcripts with real videos. An Open video link remains available as a playback fallback. No sample video is invented or loaded when fields are blank; provider embeds are not implemented.

The product buying-guidance section reuses the homepage `img/torn.png` paper background. Desktop columns are YES guidance, the supplied `img/me2.jpg` portrait, and No guidance; mobile stacks them in that order. The portrait uses the center of the same paper asset as a CSS alpha mask for torn top/bottom edges, keeping the image file intact. YES stays green, No red, and list bullets pink.

The buying-guidance heading sits above the paper. A single mask on the paper content clips the texture and portrait together, so the portrait meets the exact top/bottom tears without inset gaps. Desktop keeps YES/photo/No columns; mobile stacks YES and No on the left with the photo spanning both rows on the right.

## Shared video playback controls

The homepage has a full-content-width video immediately above the “Your Wishlist” request banner, using the currently supplied RTR CDN video URL. It does not autoplay. Homepage and product videos share `CurvyVideoPlayer` in `site.js`: a centered play button starts playback, clicking the video pauses it, and Enter/Space toggles playback by keyboard. The button announces its current Play/Pause action, retains visible keyboard focus, and reappears at the end. Native control bars are disabled in both markup and JavaScript; the centered turquoise play button is the only visible player control while paused. Playback errors are announced. The homepage preloads metadata for the initial frame; product video caption/transcript fields remain available. The supplied clip still needs editorial review and any necessary captions/transcript before production use. Full width follows the shared page container rather than exceeding its gutters.

Shared video players size to the loaded video’s intrinsic aspect ratio rather than a forced 16:9 frame. Metadata preloading establishes the dimensions before playback, keeping the click-to-pause overlay within the visible video. Posters fill that frame without extra bars.

Product video presentation matches the homepage: full content width, intrinsic video proportions, 24px section spacing, no visible section heading or Open video link, and a centered turquoise play button with click-to-pause. With no explicit `videoPoster`, the first video frame is shown instead of a product photograph. Caption tracks and optional transcripts remain supported.

Product videos now use a taller 4:3 frame for landscape footage, filling the full content width without letterbox space. Wider footage crops at the sides; a centered subject is recommended. Portrait or narrower footage retains its intrinsic proportions so full-body try-ons are not cropped vertically. Homepage video proportions remain unchanged, and both use the shared play/click-to-pause controls.

## Default inner-page hero

About, the reviews archive, individual product/review states, and missing-review states use the shared `.inner-hero` design from the supplied paper-and-photo reference. A centered torn-paper panel holds an eyebrow, one real HTML H1 with the page title, and relevant descriptive copy. Rotated white-bordered denim/clothing-rack photographs flank the panel, with a small yellow handwritten note. These photographs and accents are decorative, never presented as verified product/reviewer imagery. There is no hero CTA. Existing header requests, archive search, product purchase actions, and request banners retain their separate roles. The homepage hero is unchanged.

About uses “About CurvyGirlReviews” with an introductory summary; its original biography becomes an H2-led “A little about me” section with the supplied copy and photo retained. The archive uses “Fashion Reviews” and search-oriented descriptive copy, with search/category controls below the hero. Product states use the supplied product/review title and blurb; no facts, ratings, or dates are invented. `CurvyInnerHero.create` in `site.js` renders dynamic detail heroes; static About/archive HTML provides indexable titles and descriptions without JavaScript. Pages retain their unique metadata, canonical URLs, and existing query noindex policy. Responsive styling reduces photo exposure and type size while allowing longer titles to wrap. No serif fonts, large colored panels, or hero buttons are added.

Inner-hero verification: static About/archive HTML validation and Chromium checks passed at 1440, 820, 390, and 320px for About, archive, product, and missing-review states. Each visible state has one H1, no hero CTA, no horizontal overflow, and no axe violations. Archive search and detail navigation still work. Very narrow screens use smaller heading type to keep the brand name readable.

## My Faves

`favorite` is an editorial boolean on each review. Only `favorite: true` records that are not explicitly unpublished appear at `/my-faves/`; missing, false, or string values do not qualify. Existing records default to false until the editor chooses favorites. This is Shandy’s curated collection, not visitor-specific saved items.

My Faves reuses the reviews archive HTML pattern, inner hero, cards, URL filters, sorting, 12-item pagination, and mobile dialog through `reviews.js`, configured by `data-collection="favorites"`. Its available filter choices are derived only from favorite records. Search, chips, clearing, pagination, detail URLs, related cards, and breadcrumb links remain within the favorites collection. Empty favorites have a truthful coming-soon message and a link to all reviews. The homepage request banner appears below the collection and opens the same request dialog using `site.js`; no second form implementation is added.

My Faves replaces Shop My Closet in primary navigation and is included in footer navigation on every page. Individual product Buy Now On Vinted buttons remain. The clean favorites route has its own title, description, canonical, social metadata, and sitemap entry under the existing placeholder origin. Query variants remain noindex/follow. Static fallback markup never lists unflagged reviews as favorites. All former Shop My Closet site links are removed; shared form integrations remain unconfigured.

## Contact dialog
Contact appears last in primary navigation and opens from footer Contact links on all pages. It reuses request-dialog styling, with optional Name and required Email and Message, labeled errors, focus trapping, Escape/backdrop close, and trigger focus restoration. The 12px disclosure explains reply-only email use and the email-app handoff. After validation, Continue to email opens a percent-encoded mailto to contact@curvygirlreviews.com containing the optional name, reply email, and message. Visitors must send from their email app; no automatic delivery or site storage is claimed. Direct web submission still requires a contact service.

## Privacy page
`/privacy/` uses the shared inner hero, user-supplied policy text effective October 3, 2026, semantic sections and lists, and linked contact details. Every footer links to it. It has unique metadata and a sitemap entry. Policy content is supplied copy, not a verification that described accounts, analytics, cookie policy, or data processing are implemented.
