# Phase 3B — Find AI styling concepts (local implementation)

This workflow is implemented locally only. No provider calls, Sanity writes, uploads, or deployment were made during implementation. It does not generate Looks, scrape Amazon, publish a Find, or claim that an AI image demonstrates fit.

## Configuration before use

Set server-only `OPENAI_API_KEY`, `AI_IMAGE_SIGNING_SECRET` (at least 32 random characters), and `AI_IMAGE_EDITOR_IDS` (comma-separated project-scoped Sanity user IDs). `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-flare` and currently permits `gpt-image-2.5-flare` or `gpt-image-2.5-sunburst`. Do not prefix these with `NEXT_PUBLIC_`. Keep the OpenAI key in a dedicated project with a hard spending limit and alerts. The in-process limit of five generation requests per editor per hour is only a best-effort guard on a single server instance; it is not a distributed billing cap. Confirm the deployed runtime permits a 120-second function and responses containing up to three compressed JPEGs.

The integration uses the [OpenAI Images Edits API](https://developers.openai.com/api/reference/resources/images/methods/edit), which accepts multiple image URLs and supports `n`, `size`, `quality`, `output_format`, and `output_compression` for current GPT Image models. The request uses two Sanity CDN images, `1024x1536`, low quality, JPEG compression 75, and 1–3 outputs. `input_fidelity` is omitted because model support differs. No SDK dependency is needed. The provider is called only from a Node.js server route with a 100-second timeout; 429 responses surface `Retry-After` to the editor without automatic retries.

## Studio workflow

1. Publish an active AI Fashion Model with a complete approved reference image and usage-rights metadata. Draft and incomplete models cannot be selected by the server.
2. In the Find's **Product photographs**, use an original or separately licensed photo. Mark it Approved, check **I authorize this product photo as an AI generation reference**, record its AI-reference rights, and save the Find. Amazon images are not fetched or reused automatically.
3. In the Find editor's **AI styling concept** panel, choose automatic or explicit model selection, the authorized product photograph, styling instructions, and 1–3 variations. Click **Generate**. The selected model and both asset IDs are bound to a signed, 30-minute session; **Regenerate** uses that same model and reference pair. To change them, start a new session.
4. Review each private browser-memory preview. Add an image description and click **Approve and add to Find draft** for a selected result, or **Reject** to discard it. Closing or reloading the tab discards unapproved previews. Approval rechecks the editor, model, and product reference, verifies the exact JPEG digest, then uploads that one image and appends an unselected AI editorial entry to a Find draft. It never publishes or replaces an image. Refresh the Studio editor to see the new entry, then review the draft before any manual publication.

Only the project-scoped Sanity user IDs in `AI_IMAGE_EDITOR_IDS` can call the endpoint. The browser sends its existing Sanity editor token to the same-origin route; the server verifies it with Sanity's current-user API and makes Sanity reads/writes using that editor's permissions. The OpenAI key and signing secret never enter browser code or responses. All route responses use `Cache-Control: no-store, private`. Generated JPEGs are sent only to the authenticated editor's tab as data URLs and are not uploaded to Sanity until explicit approval. The approval ticket binds the editor, Find, model, original asset IDs, prompt, provider model, timestamp, and exact output digest.

## Release prerequisites and limits

- Test the complete flow with a dedicated non-production Sanity dataset and an OpenAI test project. The automated suite mocks the provider and makes no live generation calls.
- Confirm Studio's `useClient().config().token` is available with the configured token login method in the deployed Studio. If it is not, the panel fails closed and needs a supported Sanity auth bridge before use.
- Configure the OpenAI project spending cap. The local per-process throttle cannot enforce an aggregate cap across Vercel instances; add a shared quota store if multi-editor or high-volume use is planned.
- Confirm Sanity permissions allow the listed editors to read models/Finds, upload images, and create/update Find drafts. Do not configure a broad server-side Sanity write token for this workflow.
- Sanity assets may be public immediately after approval even while the Find is a draft. Approve only imagery cleared for public exposure. A failed draft patch after upload can leave an unreferenced asset; inspect and reconcile it manually rather than deleting assets automatically.
- The provider may imperfectly preserve body or garment details. Editorial review is essential before manually publishing an approved result. AI images remain styling concepts and must never be presented as product photographs or fit evidence.
