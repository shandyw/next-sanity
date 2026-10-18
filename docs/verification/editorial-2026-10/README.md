# Revised editorial design verification

Verified locally on October 12, 2026. This is implementation verification, not WCAG certification or a live deployment.

## Implementation

Shared public tokens now use the exact revised palette. Primary controls retain black text on pink through rest/hover/active/focus. Focus is black. Deep pink is reserved for text links. Required field boundaries use `#767676`, while decorative panel boundaries may remain subtle. Supporting copy, labels and placeholders use readable sizes/colors. Onest and Manrope are retained; Georgia is confined to the short hero caption.

The shared hero has one small textured backing, a straight dominant photo, a slightly rotated supporting frame, no tape and a rectangular highlight that follows wrapped lines. Homepage search, real CMS text/images, optional video, About copy, review requests and newsletter remain connected. Latest Verdicts is an independent newest-first review feed capped at three; it renders the blush empty panel only for an empty feed. The former social rail is retired in favor of existing configured profiles in the footer. About/support/request panels no longer use torn masks, doodles, handwritten notes or decorative tape. The logo asset is unchanged.

## Computed colors and sRGB contrast

Browser tests read computed styles and check them against the semantic tokens, including primary hover/active/focus, selected shopping sections, placeholders, field borders and email validity indicators.

| Foreground/indicator | Background | Ratio | Requirement/result |
| --- | --- | --- | --- |
| Black `#000000` | Brand pink `#F5417B` | 5.92:1 | Normal primary button text passes AA |
| Text-link pink `#B81F54` | Page `#FCFBF9` | 6.04:1 | Normal underlined link text passes AA |
| Secondary `#414755` | White `#FFFFFF` | 9.30:1 | Placeholders/supporting text pass AA |
| Secondary `#414755` | Blush `#FCE6EA` | 8.21:1 | Disabled labels remain readable |
| Control edge `#767676` | White `#FFFFFF` | 4.54:1 | Required boundary exceeds 3:1 |
| Control edge `#767676` | Page `#FCFBF9` | 4.39:1 | Required boundary exceeds 3:1 |
| Black `#000000` | Page `#FCFBF9` | 20.31:1 | Text and focus outline pass |
| Valid tick `#187441` | White `#FFFFFF` | 5.81:1 | Meaningful icon exceeds 3:1 |
| Error text `#B4232C` | White `#FFFFFF` | 6.53:1 | Normal error text passes AA |
| Invalid field edge `#C74D58` | White `#FFFFFF` | 4.53:1 | Required state boundary exceeds 3:1 |

Bright pink/white is approximately 3.54:1, so bright pink is not ordinary body/link text and primary labels are never white. Faint text is not used to communicate disabled status; only the inactive empty saved-finds icon is dimmed. Existing selected red hearts remain semantic controls.

## Checks

- Production build, strict type checking, lint and all 37 unit checks passed. The old constant-only turquoise contrast test was replaced with checks reading the actual CSS semantic tokens.
- 33 core browser checks passed for the revised homepage, shared hero/public routes, archive resets, product actions/details, wishlist storage/synchronization, email validation, lead-dialog acceptance/dismissal, reduced motion and no-JavaScript hero.
- Two additional isolated browser fixture checks passed (35 browser checks in total) for the actual LatestVerdicts/CardGrid components: five supplied test reviews produce three cards; keyboard photo controls work; passing an empty feed displays the truthful empty panel. These fixtures run on browser-intercepted test HTML, never publish content or write Sanity, and do not alter the live feed.
- The homepage was checked at 1440, 768, 390 and 320 CSS pixels. Shared public heroes/pages were checked at desktop/mobile widths; no unintended horizontal overflow was detected. Photo frames remain within hero bounds. Narrow-screen reflow was verified; separate manual browser zoom/device testing was not performed.
- Axe scans with WCAG 2/2.1/2.2 A/AA tags passed for the representative pages and dialogs tested. Keyboard review covered primary CTA focus, search, request-dialog opening/Escape/focus restoration, saved-item controls and card photo controls. This does not certify all future authored content or every browser/device.
- Main hero images load eagerly with reserved dimensions. Other photographs remain lazy where appropriate. The banner image loaded successfully after scrolling it into view, has a 240px desktop frame and no mask. The final screenshots show existing project/development photography, not the mockup models.
- Form submissions were tested using mocked provider responses; no live newsletter or request deliveries were sent for these checks. Sanity content/schema, preview/publishing behavior, metadata/URLs, product importing and Vinted/affiliate destinations were preserved.

## Existing environment warnings and remaining content

The build still reports unset SITE_URL/metadataBase and a local NODE_EXTRA_CA_CERTS path pointing to a nonexistent certificate file. Supply the real canonical origin before production deployment and correct the local certificate environment setting. No secrets or deployment settings were changed for this visual task.

The current live review feed is empty. Publish real reviews through Studio to populate Latest Verdicts. Suitable authorized main try-on, denim/detail hero, About teaser and clothing-rack banner photographs are still needed to reproduce the reference imagery. Existing Sanity homepage photo overrides and `public/img/hero/` pool are supported. Development stock About/banner images remain visibly disclosed and production-disabled; neutral placeholders remain when production images are absent. Do not identify decorative pool models as the owner.

See [desktop screenshot](home-desktop.png) and [mobile screenshot](home-mobile.png).
