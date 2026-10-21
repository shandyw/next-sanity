'use client';

import { useRef, useState } from 'react';
import { Box, Button, Card, Dialog, Flex, Select, Stack, Text } from '@sanity/ui';
import { useClient } from 'sanity';
import { parseMasterInventory, MASTER_HEADERS } from '@/lib/master-inventory';
import { fetchImportTargets, eligible, type ImportTarget } from './targets';
import {
  applyMasterRow,
  fetchMasterBrands,
  fetchMasterLabels,
  normalizeBrand,
  previewMaster,
  type MasterRow,
} from './master-model';
import {
  fetchMasterImages,
  missingMasterImages,
  resolveMasterImage,
  type MasterImageAsset,
} from './master-images';
import { INVENTORY_API_VERSION, inventoryPrice, publishedId } from '../inventory/model';

type Currency = 'USD' | 'CAD' | 'GBP' | 'EUR';
const pageSize = 25;
export function MasterInventoryImport({ onImported }: { onImported: () => void }) {
  const client = useClient({ apiVersion: INVENTORY_API_VERSION });
  const trigger = useRef<HTMLButtonElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [files, setFiles] = useState<Map<string, File>>(new Map());
  const [currency, setCurrency] = useState<Currency>('USD');
  const [rows, setRows] = useState<MasterRow[]>([]);
  const [targets, setTargets] = useState<ImportTarget[]>([]);
  const [imageAssets, setImageAssets] = useState<MasterImageAsset[]>([]);
  const [brands, setBrands] = useState<ImportTarget[]>([]);
  const [categories, setCategories] = useState<ImportTarget[]>([]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [approved, setApproved] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const fileGeneration = useRef(0);
  function invalidate() {
    setRows([]);
    setImageAssets([]);
    setApproved(false);
    setFinished(false);
    setPage(0);
    setError('');
    setFeedback('');
  }
  function close() {
    if (busy) return;
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  async function upload(file?: File) {
    const request = ++fileGeneration.current;
    invalidate();
    setCsv('');
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw Error('Use a CSV smaller than 10 MB.');
      const text = await file.text();
      if (request !== fileGeneration.current) return;
      const parsed = parseMasterInventory(text);
      if (parsed.errors.length) throw Error(parsed.errors.join('\n'));
      if (!parsed.records.length) throw Error('This CSV contains no inventory rows.');
      setCsv(text);
      setFeedback(
        `${parsed.records.length} master inventory ${parsed.records.length === 1 ? 'row' : 'rows'} detected. Preview to check existing items and photos. No data changed.`,
      );
    } catch (cause) {
      if (request === fileGeneration.current)
        setError(cause instanceof Error ? cause.message : 'Unable to read CSV.');
    }
  }
  function selectPhotos(list: FileList | null) {
    invalidate();
    const selected = new Map<string, File>();
    for (const file of Array.from(list || [])) {
      if (selected.has(file.name)) {
        setError(`Two selected files are named ${file.name}. Give every photo a unique filename.`);
        setFiles(new Map());
        return;
      }
      selected.set(file.name, file);
    }
    setFiles(selected);
  }
  function clearPhotos() {
    if (busy) return;
    invalidate();
    setFiles(new Map());
    if (photoInput.current) photoInput.current.value = '';
    setFeedback('Selected photos cleared.');
    photoInput.current?.focus();
  }
  async function preview() {
    invalidate();
    setBusy(true);
    try {
      const parsed = parseMasterInventory(csv);
      if (parsed.errors.length) throw Error(parsed.errors.join('\n'));
      for (const record of parsed.records)
        for (const filename of record.images) {
          const photo = files.get(filename);
          if (photo && photo.size > 20_000_000)
            throw Error(`${filename} exceeds the 20 MB photo limit.`);
        }
      const [existing, allBrands, allCategories] = await Promise.all([
        fetchImportTargets(client),
        fetchMasterBrands(client),
        fetchMasterLabels(client, 'clothingCategory'),
      ]);
      const existingImages = await fetchMasterImages(
        client,
        parsed.records.flatMap((record) => record.images),
        existing,
      );
      for (const record of parsed.records) {
        for (const [label, labels, kind] of [
          [record.brand, allBrands, 'brand'],
          [record.category, allCategories, 'category'],
        ] as const) {
          if (!label) continue;
          const found = labels.filter(
            (entry) => normalizeBrand(entry.title || '') === normalizeBrand(label),
          );
          if (found.length > 1)
            throw Error(
              `Multiple ${kind} labels match ${label}. Resolve duplicates in Studio first.`,
            );
          if (found[0]?._id.startsWith('drafts.'))
            throw Error(`Publish ${kind} ${label} before importing items that reference it.`);
        }
      }
      setImageAssets(existingImages);
      setTargets(existing);
      setBrands(allBrands);
      setCategories(allCategories);
      setRows(previewMaster(parsed.records, existing));
      setFeedback(
        `${parsed.records.length} ${parsed.records.length === 1 ? 'item' : 'items'} ready for review. One item per SKU, with separate prices for both stores. No data changed.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  }
  function choose(index: number, value: string) {
    setApproved(false);
    setRows((current) =>
      current.map((row, i) =>
        i !== index
          ? row
          : value.startsWith('match:')
            ? {
                ...row,
                choice: 'match',
                target: targets.find((item) => item._id === value.slice(6)),
              }
            : {
                ...row,
                choice: value as MasterRow['choice'],
                target: value === 'create' ? undefined : row.target,
              },
      ),
    );
  }
  async function confirm() {
    if (!approved || busy || finished || missing.length) return;
    const ids = rows
      .filter((row) => row.choice !== 'skip' && row.target)
      .map((row) => publishedId(row.target!._id));
    if (new Set(ids).size !== ids.length) {
      setError('Two CSV rows target the same existing item. Match separate items or skip one.');
      return;
    }
    setBusy(true);
    setError('');
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
    const failures: string[] = [];
    for (const row of rows) {
      try {
        summary[await applyMasterRow(client, row, currency, files, brands, categories)]++;
      } catch (cause) {
        summary.failed++;
        failures.push(
          `${row.record.sku}: ${cause instanceof Error ? cause.message : 'Import failed'}`,
        );
      }
    }
    setFeedback(
      `Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}. Item changes are saved as drafts. Review photos and required fields, then publish when ready.`,
    );
    setError(failures.join('\n'));
    setBusy(false);
    setFinished(true);
    setApproved(false);
    if (summary.created || summary.updated) onImported();
  }
  const changes = rows.filter((row) => row.choice !== 'skip').length;
  const missing = missingMasterImages(rows, imageAssets, files);
  const reusedIds = new Set(
    rows
      .filter((row) => row.choice !== 'skip')
      .flatMap((row) =>
        row.record.images.flatMap((name) => {
          if (files.has(name)) return [];
          const asset = resolveMasterImage(name, row.target, imageAssets).asset;
          return asset ? [asset._id] : [];
        }),
      ),
  );

  return (
    <>
      <Button
        ref={trigger}
        mode="ghost"
        text="Import master inventory CSV"
        onClick={() => setOpen(true)}
      />
      {open && (
        <Dialog
          id="master-inventory-import"
          header="Import master inventory"
          width={4}
          onClose={close}
          onClickOutside={close}
        >
          <Box
            padding={4}
            style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, lineHeight: 1.5 }}
          >
            <Stack gap={4}>
              <Text size={1}>
                Your master sheet manages one item per SKU on Vinted. Preview every
                change before saving drafts.
              </Text>
              <Text size={1}>
                Columns: {MASTER_HEADERS.join(', ')}. VINTED contains asking prices, not listing
                links. The optional URL column fills Purchase link. Blank URL cells keep existing links.
              </Text>
              <label>
                Master inventory CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => void upload(event.currentTarget.files?.[0])}
                />
              </label>
              <label>
                Currency for prices in this file
                <Select
                  value={currency}
                  disabled={busy}
                  onChange={(event) => {
                    invalidate();
                    setCurrency(event.currentTarget.value as Currency);
                  }}
                >
                  {['USD', 'CAD', 'GBP', 'EUR'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Photo files (optional)
                <input
                  ref={photoInput}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.avif"
                  disabled={busy}
                  onChange={(event) => selectPhotos(event.currentTarget.files)}
                />
              </label>
              <Text size={1}>
                In IMAGES, separate filenames with |, for example: SH-001-front.jpg |
                SH-001-back.jpg. Click Preview to find images already uploaded; select only missing
                files above. The listed order becomes the gallery order. Only photos used by
                selected rows upload after confirmation. Blank IMAGES keeps existing photos.{' '}
                {files.size} photo {files.size === 1 ? 'file' : 'files'} selected.
              </Text>
              {rows.length > 0 && (
                <Text size={1}>
                  {reusedIds.size} existing image {reusedIds.size === 1 ? 'asset' : 'assets'} will
                  be reused. {missing.length} photo{' '}
                  {missing.length === 1 ? 'file still needed' : 'files still needed'}.
                </Text>
              )}
              {missing.length > 0 && (
                <Card tone="caution" padding={3} role="alert">
                  <Text size={1}>Photo files needed</Text>
                  <ul>
                    {missing.map((item) => (
                      <li key={item.filename}>
                        select {item.filename}
                        {item.ambiguous
                          ? ' — multiple uploaded images use this filename; select the intended file.'
                          : ' — not found among uploaded images.'}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {files.size > 0 && (
                <Card border padding={3}>
                  <Stack gap={3}>
                    <Flex align="center" justify="space-between" gap={3}>
                      <Text size={1} weight="semibold">
                        Selected photos
                      </Text>
                      <Button
                        text="Clear"
                        aria-label="Clear selected photos"
                        mode="ghost"
                        disabled={busy}
                        onClick={clearPhotos}
                      />
                    </Flex>
                    <Box
                      role="region"
                      aria-label="Selected photo filenames"
                      tabIndex={0}
                      style={{ maxHeight: 200, overflowY: 'auto' }}
                    >
                      <ul style={{ margin: 0, paddingLeft: 24 }}>
                        {[...files.keys()].map((filename) => (
                          <li key={filename} style={{ overflowWrap: 'anywhere' }}>
                            {filename}
                          </li>
                        ))}
                      </ul>
                    </Box>
                  </Stack>
                </Card>
              )}
              <Button
                text={busy ? 'Working…' : 'Preview master import'}
                disabled={busy || !csv}
                onClick={() => void preview()}
              />
              {rows.length > 0 && (
                <>
                  <Card padding={3} tone="caution">
                    <Text size={1}>
                      The master sheet sets SKU, Available/Sold status, name and any filled
                      description, category, brand, condition, size, photo and marketplace-price
                      fields. Blank optional cells keep existing values. Existing slugs, reviews,
                      fit notes and other unrelated fields remain. Blank URL cells keep existing
                      links; a filled URL sets the purchase link and primary marketplace. A nonempty
                      IMAGES cell replaces the gallery with the listed photos, reusing existing
                      uploads when found. New brand and category labels are created after
                      confirmation. Items missing from this file are never deleted or marked sold.
                    </Text>
                  </Card>
                  <Box
                    overflow="auto"
                    role="region"
                    tabIndex={0}
                    aria-label="Master inventory preview; scroll horizontally on narrow screens"
                  >
                    <table style={{ width: '100%', minWidth: 1000, borderCollapse: 'collapse' }}>
                      <caption>Master inventory preview — {rows.length} items</caption>
                      <thead>
                        <tr>
                          {[
                            'SKU / Item',
                            'Status',
                            'Category / Brand / Condition / Size',
                            'Photos',
                            'Vinted',
                            'URL',
                            'Decision',
                            'Notes',
                          ].map((label) => (
                            <th key={label} scope="col" style={{ padding: 12, textAlign: 'left' }}>
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(page * pageSize, (page + 1) * pageSize).map((row, index) => (
                          <tr key={row.record.sku}>
                            <td style={{ padding: 12, maxWidth: 270, overflowWrap: 'anywhere' }}>
                              {row.record.sku}
                              <br />
                              {row.record.title}
                              <details>
                                <summary>Description</summary>
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                  {row.record.description || 'Blank: keep existing description'}
                                </div>
                              </details>
                            </td>
                            <td style={{ padding: 12 }}>
                              {row.record.status === 'sold' ? 'Sold' : 'Available'}
                              {row.target && (
                                <p>
                                  Currently:{' '}
                                  {row.target.saleStatus || row.target.availability || 'unknown'}
                                </p>
                              )}
                            </td>
                            <td style={{ padding: 12 }}>
                              <p>{row.record.category || 'Keep existing categories'}</p>
                              {row.record.category &&
                                !categories.some(
                                  (category) =>
                                    normalizeBrand(category.title || '') ===
                                    normalizeBrand(row.record.category!),
                                ) && <p>New category label</p>}
                              <p>{row.record.condition || 'Keep existing condition'}</p>
                              {row.record.brand || 'Keep existing brand'}
                              <br />
                              {row.record.size || 'Keep existing size'}
                              {row.record.brand &&
                                !brands.some(
                                  (brand) =>
                                    normalizeBrand(brand.title || '') ===
                                    normalizeBrand(row.record.brand),
                                ) && <p>New brand label</p>}
                            </td>
                            <td style={{ padding: 12 }}>
                              {row.record.images.length
                                ? `${row.record.images.length} ${row.record.images.length === 1 ? 'photo' : 'photos'} in CSV; reuse existing uploads where found`
                                : row.target?.photos?.length
                                  ? `${row.target.photos.length} ${row.target.photos.length === 1 ? 'photo' : 'photos'} kept`
                                  : 'No photos: add before publishing'}
                            </td>
                            <td style={{ padding: 12 }}>
                              {row.record.vinted !== undefined
                                ? inventoryPrice(row.record.vinted, currency)
                                : 'Blank: keep existing'}
                            </td>
                            <td style={{ padding: 12, maxWidth: 250, overflowWrap: 'anywhere' }}>
                              {row.record.url ? (
                                <>
                                  <a
                                    href={row.record.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={`Open listing for ${row.record.sku} (opens in a new tab)`}
                                  >
                                    {row.record.url}
                                  </a>
                                  <p>Vinted listing</p>
                                </>
                              ) : (
                                'Blank: keep existing link'
                              )}
                            </td>
                            <td style={{ padding: 12 }}>
                              <Select
                                aria-label={`Decision for ${row.record.sku}`}
                                disabled={busy || finished}
                                value={
                                  row.choice === 'match' ? `match:${row.target?._id}` : row.choice
                                }
                                onChange={(event) =>
                                  choose(page * pageSize + index, event.currentTarget.value)
                                }
                              >
                                <option value="skip">Skip</option>
                                <option value="create">Create new draft</option>
                                {row.target && <option value="update">Update matching SKU</option>}
                                {targets
                                  .filter((item) => eligible(item) && item.importEnabled !== false)
                                  .map((item) => (
                                    <option key={item._id} value={`match:${item._id}`}>
                                      Match: {item.sku || 'No SKU'} — {item.title || 'Untitled'}
                                    </option>
                                  ))}
                              </Select>
                            </td>
                            <td style={{ padding: 12, maxWidth: 250 }}>
                              {row.note}
                              {row.candidates.length > 0 && (
                                <p>
                                  Possible matches:{' '}
                                  {row.candidates
                                    .map(
                                      (item) =>
                                        `${item.sku || item.externalListingId || 'No SKU'} — ${item.title || 'Untitled'}`,
                                    )
                                    .join('; ')}
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>
                  <Flex gap={3} align="center">
                    <Button
                      text="Previous"
                      disabled={busy || page === 0}
                      onClick={() => setPage(page - 1)}
                    />
                    <Text size={1}>
                      Page {page + 1} of {Math.ceil(rows.length / pageSize)}
                    </Text>
                    <Button
                      text="Next"
                      disabled={busy || (page + 1) * pageSize >= rows.length}
                      onClick={() => setPage(page + 1)}
                    />
                  </Flex>
                  <label>
                    <input
                      type="checkbox"
                      checked={approved}
                      disabled={busy || finished}
                      onChange={(event) => setApproved(event.currentTarget.checked)}
                    />{' '}
                    I reviewed every selected row and match. Apply master values to item drafts and
                    create any new brand and category labels.
                  </label>
                  <Button
                    tone="primary"
                    text={busy ? 'Importing…' : `Confirm master import (${changes} changes)`}
                    disabled={!approved || busy || finished || !changes || missing.length > 0}
                    onClick={() => void confirm()}
                  />
                </>
              )}
              {error && (
                <Card tone="critical" padding={3}>
                  <div role="alert" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {error}
                  </div>
                </Card>
              )}
              <div role="status" aria-live="polite">
                {feedback}
              </div>
              <Button mode="ghost" text="Close" disabled={busy} onClick={close} />
            </Stack>
          </Box>
        </Dialog>
      )}
    </>
  );
}
