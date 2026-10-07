---
version: alpha
name: CurvyGirlReviews
description: A warm, photo-led fashion review site with bold type, handwritten accents, and turquoise details.
colors:
  primary: '#35E0DE'
  primary-ink: '#06302E'
  primary-deep: '#00706F'
  tertiary: '#F5417B'
  highlight: '#FFE86B'
  neutral: '#FCFAF7'
  surface: '#FFFFFF'
  on-surface: '#0C0D10'
  text-secondary: '#4A505C'
  border: '#E2E0DA'
  border-control: '#6F7885'
  error: '#FF3333'
  focus: '#00706F'
  transparent: 'transparent'
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
  sm: 8px
  md: 12px
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
  grid-gutter: 24px
  control-height: 52px
components:
  button-accent:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-ink}'
    rounded: '{rounded.full}'
    height: '{spacing.control-height}'
  review-card:
    backgroundColor: '{colors.transparent}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.none}'
  review-image:
    rounded: '{rounded.none}'
  sale-badge:
    backgroundColor: '{colors.on-surface}'
    textColor: '{colors.surface}'
  request-banner:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    style: torn paper with turquoise tape details
  dialog:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.xl}'
    padding: '{spacing.xl}'
---

# CurvyGirlReviews approved implementation

The migrated visual source of truth is the implemented prototype preserved in `legacy/`, captured on October 4, 2026, rather than older mockup notes. This is a technical migration into Next.js App Router, strict TypeScript, Tailwind CSS, and Sanity. `app/globals.css` retains the source CSS cascade and responsive rules; Tailwind utilities share the same CSS design tokens and do not introduce a competing reset. Existing assets are copied byte-for-byte into `public/img/`.

## Typography and assets

Onest variable (headlines, including 900), Manrope variable (body/UI, 400–800), Caveat variable (handwriting, 500–700). The source referenced Google Fonts and Cloudflare font URLs but contained no actual font files; these same families are bundled as licensed WOFF2 through Fontsource and served locally. No generic replacement typeface is used. Existing weights and overrides are retained, including the final 900 display rules.

The pink hanger logo, hearts, `torn.png`, and other local images are preserved. Hero prints keep their rotations, white frames, notes, tape, drawn arrow, and yellow tag. The homepage/about/request photography from the prototype is illustrative remote stock content, available only with the development demo switch; production uses owned Sanity assets and reserves their dimensions. Upload authorized homepage video with transcript/captions to enable the preserved video section. The uncaptained third-party prototype video is not presented as owned editorial content.

## Colors and layout

Primary turquoise #35E0DE with dark #06302E ink; focus/accent links #00706F; pink #F5417B; yellow #FFE86B; warm-white #FCFAF7; ink #0C0D10; secondary #4A505C; borders #E2E0DA and #6F7885. Colors and spacing come from the final CSS, including its 24px base grid gutter and 20px archive gutter. Content maximum 1344px; 48px desktop / 32px tablet / 20px mobile insets. Preserve compact editorial layout, responsive header, turquoise pill controls, unframed cards, scrapbook collage, wide About photo, torn-paper request strip, and joined newsletter field/button.

The header retains Reviews, About, My Faves, Contact, and Request a Review. Real social links are configurable; generic YouTube/TikTok homepages are not represented as verified profiles. Footer adds restrained Blog and Shop My Closet links to make new routes discoverable. Contact and request use accessible dialogs. Studio is never in public navigation.

No Win/Fail/Mixed badges exist. “Sale” in the original implementation meant an explicit discount with supplied sale price; availability is never a Sale badge. No discount records were supplied, so none are fabricated. Current listing prices and historical review prices remain separate.

## Content and browsing

The three existing sample reviews are isolated in `lib/demo.json`. `ENABLE_DEMO_CONTENT=true` permits a labeled local design preview only; production always disables them. Actual public reviews/posts require a slug and publication date no later than now. The Latest Verdicts section always displays up to three most recent published reviews independently of search state. Homepage search submits to the review archive and has no homepage filters.

The shop uses the established archive and card layout. An empty local closet can display 16 labeled product fixtures from `lib/demo-products.ts` with the existing pink hanger as placeholder artwork. Sample prices and all four availability states support browsing tests; sample purchase buttons are disabled. Real products take precedence, and production never displays these fixtures.

Archive controls follow the approved empty-search, search-only, and open-dropdown reference images: a joined search field/button, an outlined Clear search/filters ghost action when state exists, and pill disclosures for Category, Size, Brand, Price, plus review Format controls and a native Sort select. Selected filters leave the search input inactive; only keyboard/input focus outlines the search field. Selected disclosures keep their light border and use an outer outline matching the search focus ring, with a screen-reader selection announcement. Native checkboxes permit multiple values. Clicking or tapping outside a disclosure closes it. Escape closes a disclosure and returns focus to its summary; keyboard focus stays visible. Desktop panels overlay results, while narrow screens use two columns and panels in normal document flow to avoid clipping. Price has labeled number inputs and minimum/maximum sliders with an explicit Apply price action. Progressively enhanced Next.js GET forms update results through client navigation without reloading or scrolling to the top. Dropdowns and keyboard focus remain in place. Reset and pagination also use client navigation. Controls synchronize with URL state through refresh/back/forward, and submissions reset pagination. Matching occurs over the complete collection before sorting and 12-item pagination. Price filters appear only for a single known currency. Query/filter routes are noindex with clean archive canonicals. Review and shop search operate on distinct document types.

Review cards preserve multiple-photo scrolling and image dots; controls have at least 24px hit areas while retaining the small dot artwork. Article pages use the existing equal-column review/gallery pattern, image thumbnail selection, Portable Text content, optional captioned video/transcript, and relevant closet products. Blog templates extend these same patterns. My Faves remains a review collection. Sold/reserved products keep their review association and display state rather than a purchase action. Old or absent check timestamps show a conservative availability note.

## Accessibility and verification

Product images include a 44px wishlist toggle at their top-right corner. Its heart is outlined at rest and filled red on hover, press, keyboard focus, or when saved. The icon has an accessible save/remove label, a pressed state, a visible focus ring, live save feedback, and visible storage errors. Wishlist is separate from editorial My Faves and uses the same hero, typography, and product cards. Saved IDs live only in the visitor's browser; no account is required. Removing an item returns focus to the wishlist heading. The page explains browser-only persistence and that saving does not reserve a product.

Semantic landmarks, skip link, one H1, logical article headings, labeled forms, live submission statuses, keyboard dialogs/carousels, focus outlines, reserved image ratios, reduced motion, and narrow reflow are included. Decorative marks are hidden from assistive technology. Automated accessibility and keyboard checks supplement desktop/mobile screenshot review; they do not constitute a WCAG certification. Real authored content, imagery, video captions, and external providers still require editorial/accessibility review.

See `docs/verification/` for before/after screenshots and observations. Expected differences are honest demo labeling, removal of unverified generic social destinations and an uncaptained video until an authorized asset is supplied, CMS-driven text/photos, accessible filter controls, and new blog/shop footer links. The original design geometry and artwork remain intact.

Technical setup, Studio, previews, caching, forms, importing, and deployment preparation are documented in `README.md` and `docs/IMPORTING.md`. The full historical design document remains in `legacy/DESIGN.md` for reference.

Clear wishlist and Clear search/filters share the `btn-ghost` pill style: transparent with an outline at rest, primary turquoise with black text on hover, press, or focus, and a visible keyboard focus ring.

When the displayed product IDs or order change, the results grid fades in with a restrained 6px upward motion over 220ms. Existing cards retain their DOM identity. Initial content remains visible in server-rendered HTML, and reduced-motion preferences disable this transition.

The Request a Review dialog keeps its existing form under “Suggest an item” and adds a restrained “Send an item to review” section when Site settings has a review wishlist URL. Its turquoise pill link opens the separate Support the Reviews page; the external gift-list link lives there. Gift expectations and off-list approval instructions distinguish My Review Wishlist from visitors’ saved items.

Product card images link to `/shop/[slug]` across the closet, related items, and visitor wishlist. The wishlist heart remains a separate button outside the image link. Item detail pages reuse the existing hero, responsive two-column gallery, metadata, and Vinted actions, retain sold/reserved items and related reviews, and include unique metadata. Published item pages are included in the sitemap; local samples remain noindex.

Request a Review uses a wider 960px dialog when a review wishlist is configured, with the suggestion form and gifting section side by side at 800px and above. Below 800px the sections stack, retaining dialog scrolling and keyboard controls.

Shopping is grouped by My Vinted Closet and Curated Finds above the existing clothing filters. Prominent two-section links use the turquoise active state and stack on mobile. Category options derive from the selected section. Curated items carry explicit personal-experience text and disclosures beside affiliate purchase links. Existing closet content and URLs remain valid. Amazon gifting is presented at `/support`, separate from shop sections and visitor wishlists; the request dialog links there.
