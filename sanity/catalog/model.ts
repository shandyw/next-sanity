import type { useClient } from 'sanity';
type SanityClient = ReturnType<typeof useClient>;
import { publishedId } from '../inventory/model';
export async function saveCatalogDraft(
  client: SanityClient,
  expected: { _id: string; _rev: string },
  fields: Record<string, unknown>,
) {
  const id = publishedId(expected._id),
    draftId = `drafts.${id}`;
  const pair = await client.fetch<
    ({ _id: string; _rev: string; _type: string } & Record<string, unknown>)[]
  >('*[_type=="product" && _id in $ids]', { ids: [id, draftId] });
  const draft = pair.find((d) => d._id === draftId),
    current = draft || pair.find((d) => d._id === id);
  if (!current || current._id !== expected._id || current._rev !== expected._rev)
    throw Error('Item changed. Refresh and try again.');
  if (draft) await client.patch(draftId).ifRevisionId(draft._rev).set(fields).commit();
  else {
    const copy = { ...current, ...fields, _id: draftId };
    for (const k of ['_rev', '_createdAt', '_updatedAt'])
      delete (copy as Record<string, unknown>)[k];
    await client
      .transaction()
      .patch(id, (p) => p.ifRevisionId(current._rev).set({}))
      .create(copy)
      .commit();
  }
}
export async function assertNoProductReferences(client: Pick<SanityClient, 'fetch'>, id: string) {
  const base = publishedId(id);
  const refs = await client.fetch<{ _id: string; title?: string }[]>(
    '*[!(_id in $ids) && references($ids)][0...20]{_id,title}',
    { ids: [base, `drafts.${base}`] },
  );
  if (refs.length)
    throw Error(
      `Archive instead: this item is referenced by ${refs.map((d) => d.title || d._id).join(', ')}.`,
    );
}
