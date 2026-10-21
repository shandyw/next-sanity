# Homepage curtain verification — October 19, 2026

Implemented only on the homepage. The existing EditorialHero copy and interior collage remain in place; the homepage supplies a new media slot. Existing Homepage heroBack/heroFront fields are reused and relabeled, with no content writes or migration. No dependencies were added.

Validation:

- 96 automated tests passed, including actual full Studio schema validation/compilation.
- TypeScript, ESLint, production build and diff whitespace checks passed.
- 15 targeted browser checks passed: ten curtain checks plus five updated existing hero checks. Coverage includes 1440px, 390px and 320px alignment, constant curtain height/right anchor, open/closed handle endpoints, mouse capture/cancellation, real touch dragging and vertical scroll, pen input, keyboard steps/Home/End, button alternatives, reduced motion, intro cancellation and once-only completion, retained instructions until user adjustment, missing-photo fallback and no-JavaScript rendering. Automated accessibility checks passed for the tested controls.
- Homepage/interior route checks confirmed that About retains its previous collage and measuring tape while the homepage uses the new composition.
- Original frame/curtain dimensions and alpha padding were measured with the installed image library. Supplied graphics were preserved intact. The handle is code-rendered to retain live arrows and text.

Test photos were loaded only in isolated browser fixtures from the existing local hero image pool; they do not change production photo choices. Browser screenshots were inspected for frame filling and endpoints. Automated checks do not establish a complete assistive-technology audit.

Photo selection: Studio → Content → Homepage → Homepage left photo — always visible / Homepage right photo — curtain reveal. Set alt descriptions, crop and hotspot, then publish. Missing images show static frames and neutral placeholders; no unrelated replacement photos are inserted. See [interaction and asset details](../../../DESIGN.md#homepage-curtain-reveal).
