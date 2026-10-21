'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Flex, Heading, Select, Stack, Text, TextInput } from '@sanity/ui';
import { useClient, useDocumentPairPermissions } from 'sanity';
import { IntentLink } from 'sanity/router';
import imageUrlBuilder from '@sanity/image-url';
import styled from 'styled-components';
import { MasterInventoryImport } from '../imports/MasterInventoryImport';
import { ReviewWishlistTool } from '../review-wishlist/ReviewWishlistTool';
import { fetchWishlistProducts } from '../review-wishlist/model';
import { publishedId } from '../inventory/model';
import {
  catalogSource,
  catalogPlacements,
  catalogIssues,
  closetStatus,
  reviewProgress,
} from '../../lib/catalog';
import type { DocumentContent } from '../../lib/types';
import { saveCatalogDraft } from './model';
type Item = DocumentContent & { _rev: string; _published: boolean; lastImportedAt?: string };
const Table = styled.table`
  width: 100%;
  min-width: 1100px;
  border-collapse: collapse;
  font: 14px/1.5 system-ui;
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 12px;
    border-bottom: 1px solid var(--card-border-color);
  }
  a {
    color: var(--card-link-color);
    text-decoration: underline;
  }
  a:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 3px;
  }
  tr[data-sold='true'] {
    background: var(--card-muted-bg-color, #f1f1f1);
  }
  img {
    width: 48px;
    height: 60px;
    object-fit: cover;
  }
  caption {
    text-align: left;
    padding: 12px;
  }
`;
function RowActions({
  item,
  pending,
  onSave,
}: {
  item: Item;
  pending: boolean;
  onSave: (item: Item, fields: Record<string, unknown>) => Promise<void>;
}) {
  const [permission, checking] = useDocumentPairPermissions({
    id: publishedId(item._id),
    type: 'product',
    permission: 'update',
  });
  const disabled = pending || checking || !permission?.granted;
  return (
    <Stack gap={2}>
      <IntentLink intent="edit" params={{ id: publishedId(item._id), type: 'product' }}>
        Edit product / marketplace links
      </IntentLink>
      <Button
        mode="ghost"
        text={item.archived ? 'Restore' : 'Archive'}
        disabled={disabled}
        onClick={() => onSave(item, { archived: !item.archived })}
      />
      {catalogSource(item) === 'closet' ? (
        <Button
          mode="ghost"
          text={closetStatus(item) === 'sold' ? 'Mark available' : 'Mark sold'}
          disabled={disabled}
          onClick={() =>
            onSave(item, {
              saleStatus: closetStatus(item) === 'sold' ? 'available' : 'sold',
              availability: closetStatus(item) === 'sold' ? 'available' : 'sold',
            })
          }
        />
      ) : (
        <Select
          aria-label={`Review progress for ${item.title}`}
          value={reviewProgress(item)}
          disabled={disabled}
          onChange={(e) => onSave(item, { reviewProgress: e.currentTarget.value })}
        >
          {['not_requested', 'wanted', 'received', 'in_progress', 'reviewed'].map((v) => (
            <option key={v} value={v}>
              {v.replaceAll('_', ' ')}
            </option>
          ))}
        </Select>
      )}
    </Stack>
  );
}
const views = [
  ['all', 'All Products'],
  ['closet', 'My Closet'],
  ['finds', 'Curated Finds'],
  ['reviewWishlist', 'My Review Wishlist'],
  ['attention', 'Needs Attention'],
  ['archived', 'Archived'],
] as const;
export function ProductsTool() {
  const base = useClient({ apiVersion: '2026-10-01' });
  const client = useMemo(
    () => base.withConfig({ perspective: 'raw', useCdn: false, stega: false }),
    [base],
  );
  const [items, setItems] = useState<Item[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [pending, setPending] = useState(''),
    [view, setView] = useState('all'),
    [search, setSearch] = useState(''),
    [page, setPage] = useState(1),
    [amazonTools, setAmazonTools] = useState(false);
  const load = useCallback(async () => {
    const docs = await fetchWishlistProducts(client);
    const ids = await client.fetch<string[]>(
      '*[_type=="product" && !(_id in path("drafts.**")) && !(_id in path("versions.**"))]._id',
    );
    return docs.map((d) => ({
      ...d,
      slug: d.slug?.current || '',
      _published: ids.includes(publishedId(d._id)),
    })) as unknown as Item[];
  }, [client]);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    let live = true;
    load()
      .then((v) => {
        if (live) setItems(v);
      })
      .catch(() => {
        if (live) setError('Could not load products. Check connection and permissions.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [load]);
  // Resolve shared labels without copying their data into products.
  const [labels, setLabels] = useState<Record<string, { title: string }>>({});
  useEffect(() => {
    let live = true;
    client
      .fetch<{ _id: string; title: string }[]>(
        '*[_type in ["brand","clothingCategory"] && !(_id in path("drafts.**"))]{_id,title}',
      )
      .then((data) => {
        if (live) setLabels(Object.fromEntries(data.map((d) => [d._id, d])));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [client]);
  const resolved = items.map((item) => {
    const raw = item as unknown as { brand?: { _ref: string }; categories?: { _ref: string }[] };
    return {
      ...item,
      brand: raw.brand
        ? { _id: raw.brand._ref, title: labels[raw.brand._ref]?.title || 'Unpublished brand' }
        : undefined,
      categories: raw.categories?.map((c) => ({
        _id: c._ref,
        title: labels[c._ref]?.title || 'Unpublished category',
      })),
    };
  });
  const matchView = (item: Item, key: string) =>
    key === 'all'
      ? true
      : key === 'archived'
        ? !!item.archived
        : key === 'attention'
          ? !item.archived && catalogIssues(item).length > 0
          : !item.archived && catalogPlacements(item).includes(key as 'closet');
  const rows = resolved
    .filter(
      (d) =>
        matchView(d, view) &&
        [d.title, d.sku, d.amazonAsin, d.brand?.title].some((s) =>
          s?.toLowerCase().includes(search.toLowerCase()),
        ),
    )
    .sort((a, b) => a.title.localeCompare(b.title));
  const pages = Math.max(1, Math.ceil(rows.length / 25)),
    current = Math.min(page, pages);
  async function save(item: Item, fields: Record<string, unknown>) {
    setPending(item._id);
    setError('');
    setMessage('');
    try {
      await saveCatalogDraft(client, item, fields);
      setMessage(
        fields.saleStatus === 'sold'
          ? 'Sold status saved to draft. Publish after review. Update the Vinted listing yourself; this site does not synchronize it.'
          : 'Saved to draft. Review and publish in the product editor.',
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setPending('');
    }
  }
  return (
    <Box padding={[3, 4, 5]}>
      <Stack gap={4}>
        <Heading as="h1">Products</Heading>
        <Text>
          One catalog. Drafts take precedence. Source, placement, sale status, review progress and
          archive state are independent.
        </Text>
        <Flex gap={3} wrap="wrap">
          <IntentLink intent="create" params={{ type: 'product' }}>
            Add product
          </IntentLink>
          <MasterInventoryImport onImported={refresh} />
          <Button
            text="Amazon CSV tools"
            mode="ghost"
            onClick={() => setAmazonTools(!amazonTools)}
          />
          <Button text="Refresh" onClick={refresh} disabled={loading} />
        </Flex>
        {amazonTools && (
          <Card padding={3} border>
            <ReviewWishlistTool />
          </Card>
        )}
        <Flex gap={2} wrap="wrap">
          {views.map(([key, label]) => (
            <Button
              key={key}
              text={`${label} (${resolved.filter((d) => matchView(d, key)).length})`}
              mode={view === key ? 'default' : 'ghost'}
              aria-pressed={view === key}
              onClick={() => {
                setView(key);
                setPage(1);
              }}
            />
          ))}
        </Flex>
        <TextInput
          aria-label="Search products by name, SKU, ASIN or brand"
          placeholder="Search name, SKU, ASIN or brand"
          value={search}
          onChange={(e) => {
            setSearch(e.currentTarget.value);
            setPage(1);
          }}
        />
        {error && (
          <Card tone="critical" padding={3} role="alert">
            <Text>{error}</Text>
          </Card>
        )}
        {message && (
          <Card tone="positive" padding={3} role="status">
            <Text>{message}</Text>
          </Card>
        )}
        {loading ? (
          <Text role="status">Loading products…</Text>
        ) : !rows.length ? (
          <Text role="status">
            {search
              ? 'No matching products.'
              : 'No products in this view. Add a product or preview an import.'}
          </Text>
        ) : (
          <Box overflow="auto" tabIndex={0} role="region" aria-label="Product catalog table">
            <Table>
              <caption>
                {rows.length} products · Page {current} of {pages}. Counts cover the full catalog.
              </caption>
              <thead>
                <tr>
                  {[
                    'Thumbnail',
                    'SKU / ASIN',
                    'Name',
                    'Brand',
                    'Source / placement',
                    'Size',
                    'Availability / progress',
                    'Publication / archive',
                    'Needs attention',
                    'Last imported',
                    'Actions',
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice((current - 1) * 25, current * 25).map((item) => (
                  <tr key={item._id} data-sold={closetStatus(item) === 'sold'}>
                    <td>
                      {item.photos?.[0]?.asset?._ref ? (
                        <img
                          src={imageUrlBuilder(base)
                            .image(item.photos[0])
                            .width(96)
                            .height(120)
                            .url()}
                          alt=""
                        />
                      ) : (
                        'No public image'
                      )}
                    </td>
                    <td>{item.sku || item.amazonAsin || publishedId(item._id)}</td>
                    <th scope="row">
                      <IntentLink
                        intent="edit"
                        params={{ id: publishedId(item._id), type: 'product' }}
                      >
                        {item.title || 'Untitled'}
                      </IntentLink>
                    </th>
                    <td>{item.brand?.title || '—'}</td>
                    <td>
                      {catalogSource(item)} /{' '}
                      {catalogPlacements(item).join(', ') || 'No placements'}
                    </td>
                    <td>{item.size || item.desiredSize || '—'}</td>
                    <td>
                      {catalogSource(item) === 'closet'
                        ? closetStatus(item)
                        : reviewProgress(item).replaceAll('_', ' ')}
                    </td>
                    <td>
                      {item._id.startsWith('drafts.')
                        ? item._published
                          ? 'Published + draft edits'
                          : 'Draft'
                        : 'Published'}
                      {item.archived ? ' · Archived' : ''}
                    </td>
                    <td>{catalogIssues(item).join('; ') || '—'}</td>
                    <td>
                      {item.lastImportedAt
                        ? new Date(item.lastImportedAt).toLocaleString()
                        : 'Never'}
                    </td>
                    <td>
                      <RowActions item={item} pending={pending === item._id} onSave={save} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Box>
        )}
        <Flex gap={3}>
          <Button text="Previous" disabled={current === 1} onClick={() => setPage(current - 1)} />
          <Button text="Next" disabled={current === pages} onClick={() => setPage(current + 1)} />
        </Flex>
        <Text size={1}>
          Archive is the normal removal action. Publish archive/restore edits to change the public
          site. Permanent deletion remains in the editor and is blocked when references exist.
          Browser-saved references cannot be discovered by Studio.
        </Text>
      </Stack>
    </Box>
  );
}
