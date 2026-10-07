# Verification record — October 4, 2026

The source project was a static HTML/CSS/JavaScript prototype without a package.json, project-specific AGENTS.md, Sanity project, or provider backend. The destination repository was empty. The source remains untouched, with a complete local snapshot in `legacy/`.

## Checks

- Production Next.js build passes with no Sanity credentials. A metadataBase warning is expected until the actual SITE_URL is supplied.
- Strict TypeScript and ESLint checks pass.
- Thirteen Node tests pass: full-dataset filtering/pagination, invalid page handling, separate historical/listing prices, import validation/identity/ownership/stale snapshots, safe URLs, form validation, provider acknowledgment/failure behavior, CLI dry-run/duplicate/failure/credential boundaries, rendered sold/reserved/available product actions, and key text/control contrast ratios.
- Browser tests use Chromium at 1440px and 390px. They check homepage, About, reviews/archive/detail, blog archive, shop, My Faves, and privacy; one H1, no horizontal page overflow, and axe WCAG 2/2.1/2.2 A/AA rule scans. Additional tests cover search refresh/back/reset, dialog keyboard focus and Escape restoration, unavailable newsletter provider states, Studio indexing, draft denial, cross-origin/invalid API payloads, and mobile filter apply/cancel/sort state.
- A focused keyboard walkthrough via browser controls, recorded in `keyboard-review.json`, includes Tab/Shift+Tab in request and filter dialogs, Escape, focus restoration, menu toggle, carousel controls, search, and visible focus. Enlarged body text, 320px reflow, and reduced-motion scrolling were also checked. Automated accessibility results are not a declaration of full WCAG compliance.
- `production-checks.json` records local production HTTP checks: public routes 200, no demo reviews/photo labels, sample detail 404, preview 503 without credentials/no cookie, and newsletter 503 with explicit non-submission.
- Offline example import dry-run reports one proposed create, zero updates/skips/failures. It makes no writes. Remote identity/revision/asset checks and real imports require your Sanity project and token.

## Visual comparison

Before/after screenshots are supplied for homepage, About, and reviews at desktop 1440px and mobile 390px. `layout-measurements.json` records hero/header/H1 geometry. H1 height and position match exactly for all six representative page/viewport pairs, and header/hero dimensions match. The same approved Onest/Manrope/Caveat families, CSS rules, page widths, photos in demo, logo, notes, tapes, turquoise controls, and torn-paper assets remain.

Visual inspection caught relative CSS asset paths, newsletter field shrinkage, carousel dot hit-area artwork, and archive copy/category differences; these were corrected. Expected additions are a development-only sample notice below main content, accurate configurable social destinations, Blog/Shop footer links, and functional CMS empty states. Production photos come from owned Sanity assets. The original uncaptained third-party video needs an authorized video/transcript/captions before display. Remote prototype stock photos are not represented as Shandy or verified try-ons.

## Dependency audit

`dependency-audit.json` records 13 high findings, all direct or transitive consequences of one unresolved `braces` advisory ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)): stack exhaustion when parsing deeply nested brace patterns. The latest available braces release checked was 3.0.3, which is affected. Sanity CLI/codegen and Next ESLint tooling pull this dependency. The application does not accept brace/glob patterns from public users. This limits exposure but does not erase the audit finding; review and update patched upstream tooling before deployment. Do not run build/codegen tools against untrusted glob input.

Available compatible fixes for adm-zip, undici, smol-toml, js-yaml, and uuid were applied through targeted npm overrides. Forced audit fixes suggested older incompatible major stacks; they were not applied. This remains a material release review item, not a claim of a clean security audit.

## Requires external configuration

Authenticated Studio editing, valid-secret draft activation, real draft/public separation against a dataset, cache refresh after actual publication, image crop/hotspot output from uploaded assets, real product imports, and actual form/newsletter delivery cannot be verified without supplied project IDs/tokens/provider adapters. The missing-provider/credential failure paths were verified locally. Blog detail compilation and not-found states are verified; published blog article content requires a real document.

Supply the values in `.env.example`, publish the singleton page/settings content and real editorial documents, configure Sanity CORS, then complete the authenticated end-to-end checks before deployment. No live deployment was made.
