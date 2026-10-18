'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Select,
  Stack,
  Text,
  TextInput,
  Dialog,
} from '@sanity/ui';
import {
  useClient,
  useDocumentPairPermissions,
  useWorkspace,
  useCurrentUser,
  validateDocument,
} from 'sanity';
import { PublicationAction } from './PublicationAction';
import { IntentLink } from 'sanity/router';
import styled from 'styled-components';
import { PriceButton } from '../pricing/PricingPanel';
import { MasterInventoryImport } from '../imports/MasterInventoryImport';
import {
  fetchInventory,
  changeInventoryPublication,
  type PublicationMode,
  deleteInventoryItem,
  INVENTORY_API_VERSION,
  inventoryPrice,
  inventoryRows,
  inventoryStatus,
  inventorySummary,
  publishedId,
  saveInventoryStatus,
  type InventoryProduct,
  type InventorySort,
  type SaleStatus,
} from './model';

const Table = styled.table`
  width: 100%;
  font-family: var(--font-body-family, system-ui, sans-serif);
  border-collapse: collapse;
  font-size: 14px;
  min-width: 760px;
  th,
  td {
    padding: 14px 12px;
    text-align: left;
    border-bottom: 1px solid var(--card-border-color);
    vertical-align: top;
  }
  th {
    font-weight: 600;
    white-space: nowrap;
  }
  caption {
    text-align: left;
    padding: 12px;
  }
  td:nth-child(3) {
    max-width: 320px;
    overflow-wrap: anywhere;
  }
  a {
    color: var(--card-link-color);
    text-decoration: underline;
  }
  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }
`;
function StatusAction({
  item,
  pending,
  onSave,
}: {
  item: InventoryProduct;
  pending: boolean;
  onSave: (item: InventoryProduct, status: SaleStatus) => void;
}) {
  const [permission, checking] = useDocumentPairPermissions({
    id: publishedId(item._id),
    type: 'product',
    permission: 'update',
  });
  const allowed = permission?.granted;
  const status = inventoryStatus(item);
  return (
    <Stack gap={2}>
      <Button
        mode="ghost"
        fontSize={1}
        text={pending ? 'Saving…' : status === 'sold' ? 'Mark available' : 'Mark sold'}
        aria-label={`${status === 'sold' ? 'Mark available' : 'Mark sold'}: ${item.title || item.sku || 'item'}`}
        disabled={pending || checking || !allowed}
        onClick={() => onSave(item, status === 'sold' ? 'available' : 'sold')}
      />
      {status === 'unknown' && (
        <Button
          mode="ghost"
          fontSize={1}
          text="Mark available"
          disabled={pending || checking || !allowed}
          onClick={() => onSave(item, 'available')}
        />
      )}
      {!checking && !allowed && (
        <Text size={0}>You do not have permission to change this draft.</Text>
      )}
    </Stack>
  );
}

function DeleteAction({
  item,
  pending,
  onDelete,
}: {
  item: InventoryProduct;
  pending: boolean;
  onDelete: (item: InventoryProduct) => Promise<void>;
}) {
  const [permission, checking] = useDocumentPairPermissions({
    id: publishedId(item._id),
    type: 'product',
    permission: 'delete',
  });
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryProduct | null>(null);
  const [error, setError] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    if (!pending) {
      setOpen(false);
      button.current?.focus();
    }
  };
  return (
    <>
      <Button
        ref={button}
        text={pending ? 'Deleting…' : 'Delete item'}
        aria-label={`Delete item: ${item.title || item.sku || 'Untitled item'}`}
        tone="critical"
        mode="ghost"
        fontSize={1}
        disabled={pending || checking || !permission?.granted}
        onClick={() => {
          setError('');
          setSelectedItem(item);
          setOpen(true);
        }}
      />
      {open && (
        <Dialog
          id={`delete-${publishedId(item._id)}`}
          header="Delete item?"
          width={1}
          onClose={close}
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text>
                This deletes “{item.title || item.sku || 'Untitled item'}” and any draft/published
                versions from Sanity. Reviews and uploaded photos are kept. This does not remove the
                listing from Vinted or Poshmark.
              </Text>
              <Text>If you only want to stop selling it, use Mark sold instead.</Text>
              {error && (
                <Card tone="critical" padding={3} role="alert">
                  <Text>{error}</Text>
                </Card>
              )}
              <Flex gap={3} justify="flex-end">
                <Button text="Cancel" mode="ghost" disabled={pending} onClick={close} autoFocus />
                <Button
                  text={pending ? 'Deleting…' : 'Delete item'}
                  tone="critical"
                  disabled={pending}
                  onClick={async () => {
                    setError('');
                    try {
                      await onDelete(selectedItem || item);
                      setOpen(false);
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : 'Unable to delete. Refresh and try again.',
                      );
                    }
                  }}
                />
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </>
  );
}

export function InventoryTool() {
  const workspace = useWorkspace();
  const currentUser = useCurrentUser();
  const baseClient = useClient({ apiVersion: INVENTORY_API_VERSION });
  const client = useMemo(
    () => baseClient.withConfig({ perspective: 'raw', useCdn: false, stega: false }),
    [baseClient],
  );
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState<InventorySort>('status');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await fetchInventory(client);
      if (request === generation.current) setItems(result);
    } catch {
      if (request === generation.current)
        setError(
          'Unable to load inventory. Check your connection and Studio permissions, then retry.',
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [client]);
  useEffect(() => {
    const requests = generation;
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => {
      window.clearTimeout(timer);
      requests.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);
  async function save(item: InventoryProduct, status: SaleStatus) {
    const id = publishedId(item._id);
    setPending((previous) => [...previous, id]);
    setFeedback('');
    setError('');
    try {
      await saveInventoryStatus(client, id, status);
      setFeedback(
        `${item.sku || item.title || 'Item'} marked ${status} in its draft. Open Edit, review the draft and publish when ready. The public listing has not changed.`,
      );
      await refresh();
    } catch {
      setError(
        'Status was not saved. Your permissions may prevent this change, or another editor changed the draft. Refresh and try again.',
      );
    } finally {
      setPending((previous) => previous.filter((value) => value !== id));
    }
  }
  async function changePublication(item: InventoryProduct, mode: PublicationMode) {
    const id = publishedId(item._id);
    setPending((previous) => [...previous, id]);
    setFeedback('');
    setError('');
    try {
      await changeInventoryPublication(client, item, mode, (document) =>
        validateDocument({ document, workspace, currentUser, environment: 'studio' }),
      );
      setFeedback(
        `${item.sku || item.title || 'Item'} ${mode === 'publish' ? 'published' : 'set to Draft and unpublished'}. Public pages may take up to five minutes to refresh.`,
      );
      await refresh();
    } catch (cause) {
      const message =
        cause instanceof Error &&
        /changed|no longer|before publishing|no draft/i.test(cause.message)
          ? cause.message
          : 'Publication was not changed. Check your connection and publish/unpublish permissions. Referenced items may need their references resolved in the editor before unpublishing.';
      throw new Error(message);
    } finally {
      setPending((previous) => previous.filter((value) => value !== id));
    }
  }
  async function remove(item: InventoryProduct) {
    const id = publishedId(item._id);
    setPending((previous) => [...previous, id]);
    setFeedback('');
    setError('');
    try {
      await deleteInventoryItem(client, item);
      setFeedback(
        `${item.sku || item.title || 'Item'} deleted from Sanity. Reviews and uploaded photos were kept.`,
      );
      await refresh();
      heading.current?.focus();
    } catch (error) {
      const message =
        error instanceof Error && /changed|no longer|release/i.test(error.message)
          ? error.message
          : 'Item was not deleted. Check your delete permissions and connection. If another document references it, open the editor and resolve that reference before retrying.';
      throw new Error(message);
    } finally {
      setPending((previous) => previous.filter((value) => value !== id));
    }
  }
  const summary = inventorySummary(items);
  const matches = inventoryRows(items, search, filter, sort, descending);
  const pages = Math.max(1, Math.ceil(matches.length / 25));
  const currentPage = Math.min(page, pages);
  const visible = matches.slice((currentPage - 1) * 25, currentPage * 25);
  return (
    <Box padding={[3, 4, 5]} style={{ height: '100%', overflow: 'auto' }}>
      <Stack gap={4}>
        <Heading as="h1" size={2} ref={heading} tabIndex={-1}>
          Inventory
        </Heading>
        <Text size={1}>
          Your own closet inventory. Drafts take precedence; Curated Finds and affiliate purchase
          listings are excluded.
        </Text>
        <MasterInventoryImport onImported={() => void refresh()} />
        <Grid gridTemplateColumns={[1, 1, 3]} gap={3}>
          <Card padding={4} border radius={2}>
            <Stack gap={3}>
              <Text>Available items</Text>
              <Heading size={2}>{loading ? '…' : summary.available}</Heading>
            </Stack>
          </Card>
          <Card padding={4} border radius={2}>
            <Stack gap={3}>
              <Text>Sold items</Text>
              <Heading size={2}>{loading ? '…' : summary.sold}</Heading>
            </Stack>
          </Card>
          <Card padding={4} border radius={2}>
            <Stack gap={3}>
              <Text>Available inventory asking-price total</Text>
              <Text weight="semibold">
                {loading
                  ? '…'
                  : Object.entries(summary.totals)
                      .map(([currency, value]) => `${inventoryPrice(value, currency)} ${currency}`)
                      .join(' · ') || 'No priced inventory'}
              </Text>
              <Text size={0}>
                Not revenue. Uses the primary marketplace price; currencies totaled separately.
              </Text>
            </Stack>
          </Card>
        </Grid>
        <Text size={1}>
          Summaries cover all closet inventory, regardless of search or filter. {summary.unknown}{' '}
          items need a sale status; {summary.unpriced} available items have no valid price/currency
          and are excluded from the value.
        </Text>
        <Grid gridTemplateColumns={[1, 1, 3]} gap={3}>
          <TextInput
            aria-label="Search inventory by SKU, brand or item description"
            placeholder="Search SKU, brand or description"
            value={search}
            onChange={(event) => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Sort inventory"
            value={sort}
            onChange={(event) => {
              setSort(event.currentTarget.value as InventorySort);
              setPage(1);
            }}
          >
            <option value="status">Sale status (available first)</option>
            <option value="sku">SKU</option>
            <option value="brand">Brand</option>
            <option value="price">Price (grouped by currency)</option>
          </Select>
          <Flex gap={2}>
            <Button
              mode="ghost"
              text={descending ? 'Descending' : 'Ascending'}
              aria-label="Reverse sort direction"
              aria-pressed={descending}
              onClick={() => {
                setDescending(!descending);
                setPage(1);
              }}
            />
            <Button mode="ghost" text="Refresh" disabled={loading} onClick={() => void refresh()} />
          </Flex>
        </Grid>
        <Flex gap={2} wrap="wrap" role="group" aria-label="Filter inventory by sale status">
          {[
            ['all', items.length],
            ['available', summary.available],
            ['sold', summary.sold],
          ].map(([value, count]) => (
            <Button
              key={value}
              mode={filter === value ? 'default' : 'ghost'}
              text={`${String(value)[0].toUpperCase()}${String(value).slice(1)} (${count})`}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(String(value));
                setPage(1);
              }}
            />
          ))}
        </Flex>
        {error && (
          <Card tone="critical" padding={3} role="alert">
            <Text>{error}</Text>
          </Card>
        )}
        <div role="status" aria-live="polite">
          {feedback && (
            <Card tone="positive" padding={3}>
              <Text>{feedback}</Text>
            </Card>
          )}
          {loading && <Text>Loading inventory…</Text>}
        </div>
        {!loading && !error && !matches.length && (
          <Card border padding={4}>
            <Stack gap={3}>
              <Text>
                {items.length
                  ? 'No items match your search or filter.'
                  : 'No closet inventory yet. Add a Shopping item in Content with shopping section My Closet.'}
              </Text>
              {!items.length && (
                <IntentLink intent="create" params={{ type: 'product' }}>
                  Create a Shopping item in My Closet
                </IntentLink>
              )}
              {items.length > 0 && (
                <Button
                  mode="ghost"
                  text="Reset search and filters"
                  onClick={() => {
                    setSearch('');
                    setFilter('all');
                    setPage(1);
                  }}
                />
              )}
            </Stack>
          </Card>
        )}
        {!!matches.length && (
          <Box
            style={{ overflowX: 'auto' }}
            tabIndex={0}
            role="region"
            aria-label="Inventory table; scroll horizontally on narrow screens"
            aria-busy={loading}
          >
            <Table>
              <caption>
                {matches.length} matching {matches.length === 1 ? 'item' : 'items'} · Page{' '}
                {currentPage} of {pages}
              </caption>
              <thead>
                <tr>
                  {[
                    'SKU',
                    'Brand',
                    'Item Description',
                    'Size',
                    'Price',
                    'Available/Sold',
                    'Actions',
                  ].map((label) => (
                    <th key={label} scope="col">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <InventoryRow
                    key={publishedId(item._id)}
                    item={item}
                    pending={pending.includes(publishedId(item._id))}
                    onSave={save}
                    onDelete={remove}
                    onPublication={changePublication}
                    onApplied={() => void refresh()}
                  />
                ))}
              </tbody>
            </Table>
          </Box>
        )}
        {pages > 1 && (
          <Flex gap={3} align="center" role="navigation" aria-label="Inventory pages">
            <Button
              mode="ghost"
              text="Previous"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            />
            <Text size={1}>
              Page {currentPage} of {pages}
            </Text>
            <Button
              mode="ghost"
              text="Next"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            />
          </Flex>
        )}
      </Stack>
    </Box>
  );
}
function InventoryRow({
  item,
  pending,
  onSave,
  onApplied,
  onDelete,
  onPublication,
}: {
  item: InventoryProduct;
  pending: boolean;
  onSave: (item: InventoryProduct, status: SaleStatus) => void;
  onApplied: () => void;
  onDelete: (item: InventoryProduct) => Promise<void>;
  onPublication: (item: InventoryProduct, mode: PublicationMode) => Promise<void>;
}) {
  const status = inventoryStatus(item);
  const description = (item.description || item.title || 'Untitled item')
    .replace(/\s+/g, ' ')
    .trim();
  return (
    <tr
      style={{
        backgroundColor:
          status === 'sold' ? 'color-mix(in srgb, currentColor 6%, transparent)' : undefined,
      }}
    >
      <td>{item.sku || 'Not assigned'}</td>
      <td>{item.brandName || '—'}</td>
      <td>{description.length > 140 ? `${description.slice(0, 137)}…` : description}</td>
      <td>{item.size || '—'}</td>
      <td>
        {inventoryPrice(item.listingPrice, item.currency)}
        {item.poshmarkPrice && (
          <p>Poshmark: {inventoryPrice(item.poshmarkPrice.amount, item.poshmarkPrice.currency)}</p>
        )}
        {item.vintedPrice && (
          <p>Vinted: {inventoryPrice(item.vintedPrice.amount, item.vintedPrice.currency)}</p>
        )}
      </td>
      <td>
        {status === 'sold'
          ? 'Sold'
          : status === 'available'
            ? 'Available'
            : `Needs status (${item.availability || 'unknown'})`}
        <p>{item._id.startsWith('drafts.') ? 'Draft · publishing required' : 'Published'}</p>
      </td>
      <td>
        <Stack gap={3}>
          <IntentLink
            intent="edit"
            params={{ id: publishedId(item._id), type: 'product' }}
            aria-label={`Edit ${item.title || item.sku || 'item'} (full product editor)`}
          >
            Edit
          </IntentLink>
          <PublicationAction item={item} pending={pending} onChange={onPublication} />
          <StatusAction item={item} pending={pending} onSave={onSave} />
          <PriceButton id={publishedId(item._id)} onApplied={onApplied} />
          <DeleteAction item={item} pending={pending} onDelete={onDelete} />
        </Stack>
      </td>
    </tr>
  );
}
