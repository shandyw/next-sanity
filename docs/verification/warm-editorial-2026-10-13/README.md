# Warm editorial verification — October 13, 2026

Implemented from the supplied homepage reference and written brief. Previous editorial screenshots remain in `../editorial-2026-10/` for comparison. This folder contains current homepage captures at 1440, 390 and 320 CSS pixels, plus isolated review-preview fixtures at 1440 and 390 pixels. Fixture text/images are test data, never published content or CMS writes.

## Results

- Production build, strict TypeScript check and repository lint passed.
- All 37 unit tests passed, including import ownership, inventory/pricing boundaries, form validation and theme contrast.
- All 35 relevant browser cases passed across the final verification runs: editorial homepage and computed states, shared hero routes, animation/reduced motion/no JavaScript, review fixtures, forms/lead signup, saved finds, empty reviews, wishlist storage and product details. Earlier failures exposed a selected shop tab contrast issue and insufficient script-highlight clearance; both were corrected and the affected cases passed again.
- Headings computed to Georgia; script computed to the preloaded local Dancing Script variable at genuine weight 600. The font loaded successfully without a third-party font request. Shannequin's accent is 40px desktop and 28px mobile.
- Hero outfit/detail bottoms aligned, with staggered tops and no frames, rotation, shadows or captions. No horizontal document overflow at 1440, 768, 390 or 320px.
- Effective widths 720 and 360px model reflow for 200%/400% zoom on a 1440px viewport. No overflow occurred; socials computed to an in-flow relative position. This is a reflow approximation, not a claim of manual browser/device zoom testing.
- Keyboard CTA navigation, carousel controls, dialog Escape/focus restoration and existing form feedback passed. Automated axe WCAG-tagged checks passed on tested routes/components; this is not a full compliance certification.
- Review fixtures verified the three-review limit, editor-selected highlights, missing optional size metadata, unmatched-highlight fallback, long title wrapping and carousel operation.
- `/about#shannequin` exists and its heading stays below the top edge at desktop/mobile anchor navigation.

## Contrast

Computed button labels/fills remained white/berry at rest, hover, active and focus. Values from the actual semantic tokens:

| Pair | Contrast |
| --- | --- |
| White / berry | 8.77:1 |
| Berry / page | 8.52:1 |
| Ink / pink highlight | 10.10:1 |
| Ink / secondary pink | 6.39:1 |
| Secondary text / page | 9.29:1 |
| Control border / white | 4.83:1 |

Existing success/error feedback also passed its contrast assertions.

## Remaining editorial/configuration work

Publish an owned full-body photograph in **About page → Shannequin full-body photograph**. That single field supplies both homepage and About; no such asset was present. The local development placeholder is explicitly labeled, and production uses a neutral awaiting-photo state. Existing hero pool assets remain; publish appropriate owned outfit/detail photos, About photography and banner photography to approach the reference composition. No model imagery or mock reviews were copied from the screenshot.

No provider emails/subscriptions were sent during tests; provider responses were mocked. No CMS documents were migrated, changed or published, and no deployment was made. Real screen-reader/device tests and manual browser zoom remain outstanding.

The successful production build still reports the existing missing canonical `SITE_URL`/metadataBase configuration and a malformed local extra-certificate path ending in `.pemexport`. Supply the actual production origin and correct the local certificate environment before release; no domain or secret was invented.
