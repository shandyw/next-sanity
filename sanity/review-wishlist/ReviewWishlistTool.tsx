'use client';
import { assertNoProductReferences } from '../catalog/model';
import { catalogPlacements } from '../../lib/catalog';
import { isAmazonProduct, amazonEditorialIssues, productIndexable } from '../../lib/amazon';
import type { DocumentContent } from '../../lib/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Heading,
  Grid,
  Stack,
  Text,
  TextInput,
  Select,
} from '@sanity/ui';
import {
  useClient,
  useWorkspace,
  useCurrentUser,
  validateDocument,
  type SanityDocument,
} from 'sanity';
import { IntentLink } from 'sanity/router';
import {
  parseReviewWishlist,
  wishIdentity,
  wishReceived,
  type ReviewWish,
  type WishCsvRow,
} from '../../lib/review-wishlist';
import { fetchWishlistProducts, matchWishlistRow, importWishlistRow, WISHLIST_API } from './model';
export function ReviewWishlistTool() {
  const client = useClient({ apiVersion: WISHLIST_API }).withConfig({
    perspective: 'raw',
    useCdn: false,
  });
  const workspace = useWorkspace();
  const currentUser = useCurrentUser();
  const [items, setItems] = useState<ReviewWish[]>([]),
    [preview, setPreview] = useState<{ row: WishCsvRow; existing?: ReviewWish }[]>([]);
  const [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('all'),
    [sort, setSort] = useState('title'),
    [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{
    item: ReviewWish;
    action: 'delete' | 'publish' | 'draft';
  }>();
  // The hook client identity is stable; fetch always uses the raw draft/published perspective.
  const baseClient = useClient({ apiVersion: WISHLIST_API });
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await fetchWishlistProducts(baseClient.withConfig({ perspective: 'raw', useCdn: false })),
      );
    } catch {
      setError('Could not load items. Check connection and Studio permissions.');
    } finally {
      setLoading(false);
    }
  }, [baseClient]);
  useEffect(() => {
    let live = true;
    fetchWishlistProducts(baseClient.withConfig({ perspective: 'raw', useCdn: false }))
      .then((data) => {
        if (live) setItems(data);
      })
      .catch(() => {
        if (live) setError('Could not load items. Check connection and Studio permissions.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [baseClient]);
  const wishlist = items.filter((i) =>
    catalogPlacements(i as import('../../lib/catalog').CatalogFields).includes('reviewWishlist'),
  );
  const visible = useMemo(
    () =>
      wishlist
        .filter(
          (i) =>
            (!query ||
              `${i.title} ${i.amazonAsin || ''}`.toLowerCase().includes(query.toLowerCase())) &&
            (filter === 'all' || (filter === 'received') === wishReceived(i)),
        )
        .sort((a, b) =>
          sort === 'priority'
            ? ['high', 'medium', 'low'].indexOf(a.priority || 'medium') -
              ['high', 'medium', 'low'].indexOf(b.priority || 'medium')
            : (a.title || 'Untitled item').localeCompare(b.title || 'Untitled item'),
        ),
    [wishlist, query, filter, sort],
  );
  const pages = Math.max(1, Math.ceil(visible.length / 20));
  const currentPage = Math.min(page, pages);
  async function csv(file?: File) {
    if (!file) return;
    setError('');
    setMessage('');
    setPreview([]);
    try {
      if (file.size > 2_000_000) throw Error('Choose a CSV smaller than 2 MB.');
      const products = await fetchWishlistProducts(client);
      const rows = parseReviewWishlist(await file.text());
      setPreview(rows.map((row) => ({ row, existing: matchWishlistRow(row, products) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'CSV could not be read.');
    }
  }
  async function runImport() {
    setPending(true);
    setError('');
    let done = 0;
    try {
      for (const { row, existing } of preview) {
        await importWishlistRow(client, row, existing);
        done++;
        setMessage(`Saved ${done} of ${preview.length} drafts…`);
      }
      setPreview([]);
      setMessage(`${done} Curated Finds saved as drafts. Review each item and publish when ready.`);
    } catch (e) {
      setError(
        `${done} drafts saved before import stopped. ${e instanceof Error ? e.message : 'Check permissions and connection.'} Preview again to continue safely.`,
      );
      setPreview([]);
    } finally {
      setPending(false);
      await refresh();
    }
  }
  async function receive(item: ReviewWish) {
    setPending(true);
    setError('');
    try {
      const pair = await client.fetch<ReviewWish[]>('*[_type=="product" && _id in $ids]', {
        ids: [wishIdentity(item._id), `drafts.${wishIdentity(item._id)}`],
      });
      const fresh = pair.find((d) => d._id.startsWith('drafts.')) || pair[0];
      if (fresh?._rev !== item._rev) throw Error('Item changed. Refresh before updating.');
      const value = wishReceived(item) ? 0 : item.requestedQuantity || 1;
      if (item._id.startsWith('drafts.'))
        await client
          .patch(item._id)
          .ifRevisionId(item._rev)
          .set({ receivedQuantity: value, reviewProgress: value ? 'received' : 'wanted' })
          .commit();
      else {
        const { _id, _rev, _createdAt, _updatedAt, ...fields } = item;
        void _rev;
        void _createdAt;
        void _updatedAt;
        await client
          .transaction()
          .patch(_id, (p) => p.ifRevisionId(item._rev).set({}))
          .create({
            ...fields,
            _id: `drafts.${_id}`,
            _type: 'product',
            receivedQuantity: value,
            reviewProgress: value ? 'received' : 'wanted',
          })
          .commit();
      }
      setMessage('Quantity saved to draft. Publish to update the public wishlist.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update item.');
    } finally {
      setPending(false);
      await refresh();
    }
  }
  async function action() {
    if (!confirm) return;
    setPending(true);
    setError('');
    try {
      const { item, action } = confirm;
      const id = wishIdentity(item._id),
        draftId = `drafts.${id}`;
      const pair = await client.fetch<ReviewWish[]>('*[_type=="product" && _id in $ids]', {
        ids: [id, draftId],
      });
      const draft = pair.find((d) => d._id === draftId),
        published = pair.find((d) => d._id === id),
        fresh = draft || published;
      if (fresh?._rev !== item._rev) throw Error('Item changed. Refresh before continuing.');
      if (action === 'delete') {
        await assertNoProductReferences(client, wishIdentity(item._id));
        let tx = client.transaction();
        for (const doc of pair)
          tx = tx.patch(doc._id, (p) => p.ifRevisionId(doc._rev).set({})).delete(doc._id);
        await tx.commit();
      } else if (action === 'publish') {
        if (!draft) throw Error('No draft to publish.');
        const markers = await validateDocument({
          document: draft as unknown as SanityDocument,
          workspace,
          currentUser,
          environment: 'studio',
        });
        const errors = markers.filter((m) => m.level === 'error');
        if (errors.length)
          throw Error(`Open Edit and fix: ${errors.map((m) => m.message).join('; ')}`);
        await client.action({
          actionType: 'sanity.action.document.publish',
          draftId,
          publishedId: id,
          ifDraftRevisionId: draft._rev,
          ...(published ? { ifPublishedRevisionId: published._rev } : {}),
        });
      } else {
        if (draft || !published) throw Error('Publication state changed. Refresh.');
        await client.action({
          actionType: 'sanity.action.document.unpublish',
          draftId,
          publishedId: id,
        });
      }
      setConfirm(undefined);
      setMessage('Saved. Public pages may take up to five minutes to refresh.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed. Check permissions and connection.');
    } finally {
      setPending(false);
      await refresh();
    }
  }
  return (
    <Box padding={[3, 4, 5]}>
      <Stack gap={4}>
        <Heading as="h1">My review wishlist</Heading>
        <Text>
          Curated Finds I want to review. CSV imports save drafts; publishing includes all current
          draft edits. Received items stay in Curated Finds but leave My Review Wishlist.
        </Text>
        <Flex gap={3} wrap="wrap">
          <Button
            as={IntentLink}
            intent="create"
            params={{ type: 'product', template: 'review-wishlist-product' }}
            text="Add a Curated Find"
          />
          <Button text="Refresh" mode="ghost" disabled={pending} onClick={refresh} />
        </Flex>
        <Card padding={4} border>
          <Stack gap={3}>
            <Text weight="semibold">Import Amazon wishlist CSV</Text>
            <label htmlFor="review-wishlist-csv">Choose CSV (up to 2 MB)</label>
            <input
              id="review-wishlist-csv"
              type="file"
              accept=".csv,text/csv"
              disabled={pending}
              onChange={(e) => {
                void csv(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            <Text size={1}>
              Matches ASINs across drafts and published products. Repeat imports update the CSV
              import reference, preserving editorial copy, public images, placements, overrides and
              review progress. Preview is a dry run. No scraping or Amazon synchronization.
            </Text>
          </Stack>
        </Card>
        {error && (
          <Card tone="critical" padding={3} role="alert">
            <Text>{error}</Text>
          </Card>
        )}
        <div role="status">{message}</div>
        {!!preview.length && (
          <Card padding={4} border>
            <Stack gap={3}>
              <Heading as="h2" size={1}>
                Preview: {preview.length} items
              </Heading>
              <Box style={{ overflowX: 'auto', maxHeight: 350 }}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Item</th>
                      <th scope="col">ASIN</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map(({ row, existing }) => (
                      <tr key={row.asin}>
                        <td>{row.title}</td>
                        <td>{row.asin}</td>
                        <td>
                          {existing
                            ? (existing.importedFacts as {fingerprint?:string}|undefined)?.fingerprint === JSON.stringify(row) ? 'Unchanged — no write' : 'Changed — update draft'
                            : 'Create Curated Find draft'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
              <Flex gap={3}>
                <Button
                  text={pending ? 'Importing…' : 'Import drafts'}
                  disabled={pending}
                  onClick={runImport}
                />
                <Button
                  text="Clear preview"
                  mode="ghost"
                  disabled={pending}
                  onClick={() => setPreview([])}
                />
              </Flex>
            </Stack>
          </Card>
        )}
        <details>
          <summary>
            Amazon content audit (
            {items.filter((item) => isAmazonProduct(item as unknown as DocumentContent)).length}{' '}
            products)
          </summary>
          <ul>
            {items
              .filter((item) => isAmazonProduct(item as unknown as DocumentContent))
              .map((item) => {
                const product = item as unknown as DocumentContent;
                const issues = amazonEditorialIssues(product);
                return (
                  <li key={item._id}>
                    <IntentLink
                      intent="edit"
                      params={{ id: wishIdentity(item._id), type: 'product' }}
                    >
                      {item.title || 'Untitled item'}
                    </IntentLink>{' '}
                    —{' '}
                    {productIndexable(product)
                      ? 'Eligible for indexing'
                      : 'Noindex until editorial checks pass'}
                    {issues.length > 0 && (
                      <ul>
                        {issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
          </ul>
        </details>
        <Text>
          {wishlist.length} total · {wishlist.filter((i) => !wishReceived(i)).length} wanted ·{' '}
          {wishlist.filter(wishReceived).length} received (all wishlist items, regardless of
          filters).
        </Text>
        <Grid gridTemplateColumns={[1, 1, 3]} gap={3}>
          <TextInput
            aria-label="Search wishlist items"
            placeholder="Search item or ASIN"
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Wishlist status"
            value={filter}
            onChange={(e) => {
              setFilter(e.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="all">All</option>
            <option value="wanted">Wanted</option>
            <option value="received">Received</option>
          </Select>
          <Select
            aria-label="Sort wishlist items"
            value={sort}
            onChange={(e) => setSort(e.currentTarget.value)}
          >
            <option value="title">Item name</option>
            <option value="priority">Priority</option>
          </Select>
        </Grid>
        {loading ? (
          <Text>Loading items…</Text>
        ) : !visible.length ? (
          <Text>
            {wishlist.length
              ? 'No matching items.'
              : 'No wishlist items yet. Import your CSV or add a Curated Find and enable My review wishlist.'}
          </Text>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <caption>
                My review wishlist · page {currentPage} of {pages}
              </caption>
              <thead>
                <tr>
                  {['Item', 'Priority', 'Wanted / received', 'Publication', 'Actions'].map((h) => (
                    <th key={h} scope="col" style={{ textAlign: 'left', padding: 12 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.slice((currentPage - 1) * 20, currentPage * 20).map((item) => (
                  <tr
                    key={item._id}
                    style={{
                      background: wishReceived(item) ? 'var(--card-muted-bg-color)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: 12, maxWidth: 300 }}>
                      {item.title}
                      <br />
                      {item.amazonAsin}
                    </td>
                    <td>{item.priority || 'medium'}</td>
                    <td>
                      {item.requestedQuantity || 1} / {item.receivedQuantity || 0}
                      {wishReceived(item) ? ' · Received' : ''}
                    </td>
                    <td>{item._id.startsWith('drafts.') ? 'Draft' : 'Published'}</td>
                    <td>
                      <Flex gap={2} wrap="wrap">
                        <Button
                          as={IntentLink}
                          intent="edit"
                          params={{ id: wishIdentity(item._id), type: 'product' }}
                          text="Edit"
                          mode="ghost"
                        />
                        <Button
                          text={wishReceived(item) ? 'Mark wanted' : 'Mark received'}
                          mode="ghost"
                          disabled={pending}
                          onClick={() => receive(item)}
                        />
                        <Button
                          text={item._id.startsWith('drafts.') ? 'Publish' : 'Set to Draft'}
                          disabled={pending}
                          mode="ghost"
                          onClick={() =>
                            setConfirm({
                              item,
                              action: item._id.startsWith('drafts.') ? 'publish' : 'draft',
                            })
                          }
                        />
                        <Button
                          text="Delete item"
                          tone="critical"
                          mode="ghost"
                          disabled={pending}
                          onClick={() => setConfirm({ item, action: 'delete' })}
                        />
                      </Flex>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}
        <Flex gap={3}>
          <Button
            text="Previous"
            mode="ghost"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          />
          <Button
            text="Next"
            mode="ghost"
            disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}
          />
        </Flex>
        {confirm && (
          <Dialog
            id="review-wishlist-confirm"
            header={
              confirm.action === 'delete'
                ? 'Delete item permanently?'
                : confirm.action === 'publish'
                  ? 'Publish the complete draft?'
                  : 'Set item to Draft?'
            }
            onClose={() => {
              if (!pending) setConfirm(undefined);
            }}
            width={1}
          >
            <Box padding={4}>
              <Stack gap={4}>
                <Text>{confirm.item.title}</Text>
                <Text>
                  {confirm.action === 'delete'
                    ? 'Deletes the draft and published product from Curated Finds, including any wishlist listing. Amazon is unchanged.'
                    : confirm.action === 'publish'
                      ? 'All current draft edits will be published after validation.'
                      : 'Removes the product from the public site and keeps an editable draft. Amazon is unchanged.'}
                </Text>
                {error && (
                  <Card tone="critical" padding={3} role="alert">
                    <Text>{error}</Text>
                  </Card>
                )}
                <Flex gap={3}>
                  <Button
                    text="Cancel"
                    mode="ghost"
                    disabled={pending}
                    autoFocus
                    onClick={() => setConfirm(undefined)}
                  />
                  <Button
                    text={pending ? 'Working…' : 'Confirm'}
                    tone={confirm.action === 'delete' ? 'critical' : 'primary'}
                    disabled={pending}
                    onClick={action}
                  />
                </Flex>
              </Stack>
            </Box>
          </Dialog>
        )}
      </Stack>
    </Box>
  );
}
