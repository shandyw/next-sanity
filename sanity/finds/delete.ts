import type { useClient } from 'sanity';

type FindClient = Pick<ReturnType<typeof useClient>, 'fetch' | 'action' | 'transaction'>;

type FindReference = {
  _id: string;
  _type: string;
  _rev: string;
  title?: string;
  items?: { find?: { _ref?: string }; [key: string]: unknown }[];
};

async function findReferences(client: FindClient, id: string) {
  const base = id.replace(/^drafts\./, '');
  return client.fetch<FindReference[]>(
    '*[!(_id in $ids) && references($ids)]{_id,_type,_rev,title,items}',
    { ids: [base, `drafts.${base}`] },
  );
}

function assertNoOtherReferences(refs: FindReference[]) {
  if (refs.length)
    throw Error(
      `Remove links to this Find from: ${refs.map((item) => item.title || item._id).join(', ')}.`,
    );
}

export async function assertNoFindReferences(client: FindClient, id: string) {
  assertNoOtherReferences(await findReferences(client, id));
}

export async function deleteFind(client: FindClient, id: string) {
  const publishedId = id.replace(/^drafts\./, '');
  const refs = await findReferences(client, publishedId);
  const lookUpdates = refs.map((look) => ({
    look,
    items: look.items?.filter((item) => {
      const ref = item.find?._ref;
      return ref !== publishedId && ref !== `drafts.${publishedId}`;
    }),
  }));
  assertNoOtherReferences(
    lookUpdates
      .filter(
        ({ look, items }) => look._type !== 'look' || !items || items.length === look.items?.length,
      )
      .map(({ look }) => look),
  );
  if (lookUpdates.length) {
    let transaction = client.transaction();
    for (const { look, items } of lookUpdates) {
      transaction = transaction.patch(look._id, (patch) =>
        patch.ifRevisionId(look._rev).set({ items }),
      );
    }
    await transaction.commit({ visibility: 'sync' });
  }
  await client.action({
    actionType: 'sanity.action.document.delete',
    publishedId,
    includeDrafts: [`drafts.${publishedId}`],
  });
}
