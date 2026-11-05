# Phase 3A — AI Fashion Model Library

Phase 3A adds a local Sanity Studio schema and pure selection utility. It does not generate images, call an AI service, publish model documents, upload assets, or change public routes. Six **proposed** identities are in [PHASE-3A-MODEL-PROPOSALS.json](PHASE-3A-MODEL-PROPOSALS.json). They are review data only, marked inactive with draft reference approval and no image assets. The owner must review each identity and upload/approve a reference before use. Sanity image assets may be publicly accessible even when the containing document is a draft; only upload references cleared for that exposure.

## Studio workflow

Open **AI Studio → Fashion Models** to create or edit a model. The **Active Models** and **Inactive Models** lists use native Sanity filters. Each model has one primary image, explicit source and usage-rights fields, alt text, optional image notes, and a separate reference-approval state. The image source distinguishes an AI-generated fictional reference from a licensed/authorized photograph. `description` is for private editorial notes and must not be projected into a public page or a generation prompt.

Fill name, US 16/16–18/18 editorial size, height/bust/waist/hips in inches, a stable identity description, and an editor-uploaded reference. Body shape and concise appearance details are optional. Measurements are visual guidance and never guarantee garment fit or imply firsthand testing. Studio validation allows work in drafts but requires the essential fields and approved reference before publication. A published model is not automatically generation-ready: the selector checks every eligibility rule again.

## Selection contract

`selectFashionModel(models, { modelId?, random? })` in `lib/ai-fashion-models.ts` is pure and provider-independent. A future server-side generation action should retrieve published `aiFashionModel` records using only the fields in `AiFashionModel`, then call it **once** at session creation. Store the returned `_id` with the session and every variation/retry. Do not call the random selector on a React render or for each of three simultaneous variations. A later Change Model action should pass `modelId` explicitly. Do not project `description` into generation or public queries.

An eligible model is a published document ID (not a `drafts.` or `versions.` ID), active, named, in the supported size list, with finite in-range height/bust/waist/hips, an identity prompt of at least 40 characters, an image asset, alt text, source/rights metadata, and `referenceImageApproval: "approved"`. The optional body-shape label is never inferred from measurements. The selector uses uniform random choice over eligible records; its injected random function makes tests deterministic. A requested missing or ineligible ID returns `{ ok: false, reason: "unavailable", requestedId }` without falling back. A library with no eligible records returns `{ ok: false, reason: "empty" }`.

Find `editorialImageEntry` and Look `lookImageEntry` now accept an optional `fashionModel` reference when `sourceKind` is `aiGenerated`. This records the fictional model used in a future generated image; no current frontend query dereferences it. Existing records remain valid without the field. Find product photographs cannot use AI imagery. Future generated outfit images should be treated as styling concepts, never verified product photographs or evidence of a personal try-on.

## Before Phase 3B

- Review the six proposed identities and measurement ranges; edit or replace them as desired.
- Create or upload appropriate fictional reference imagery manually, with alt text, source, and documented usage rights. Do not upload sensitive/unlicensed likenesses.
- Approve reference images and activate only complete models intended for generation.
- Confirm the future generation action fetches published records, runs `selectFashionModel` once, and persists the chosen ID with all generated variations.
- Preserve the selected model reference and source/approval metadata on generated Find images.
- Define the generation provider, prompt/output review flow, and editorial disclosure in Phase 3B. The current Look image entry records source but has no approval gate; add that before Phase 3C publishes AI-generated outfit images.
