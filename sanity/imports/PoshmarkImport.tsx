'use client';

import { useRef, useState } from 'react';
import { Box, Button, Card, Dialog, Flex, Select, Stack, Text, TextInput } from '@sanity/ui';
import { useClient } from 'sanity';
import {
  convertPoshmarkInventory,
  inspectPoshmarkCsv,
  parseInventoryCsv,
  poshmarkMappingSchema,
} from '@/lib/poshmark-import';
import {
  applyImport,
  eligible,
  fetchImportTargets,
  previewImport,
  type ImportTarget,
  type PoshmarkRecord,
  type PreviewRow,
} from './model';
import { INVENTORY_API_VERSION, publishedId } from '../inventory/model';

type Detected = ReturnType<typeof inspectPoshmarkCsv>;
const pageSize = 25;

export function PoshmarkImport({ onImported }: { onImported: () => void }) {
  const client = useClient({ apiVersion: INVENTORY_API_VERSION });
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [detected, setDetected] = useState<Detected>();
  const [source, setSource] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [checkedAt, setCheckedAt] = useState('');
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [targets, setTargets] = useState<ImportTarget[]>([]);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [page, setPage] = useState(0);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [finished, setFinished] = useState(false);
  function invalidate() {
    setRows([]);
    setApproved(false);
    setFinished(false);
    setFeedback('');
    setError('');
    setPage(0);
  }
  function close() {
    if (busy) return;
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  const missing = detected
    ? (() => {
        const parsed = parseInventoryCsv(csv, detected.headerRow);
        return parsed.rows
          .map((row) => ({
            id: row[parsed.headers.indexOf(detected.columns.externalListingId)]?.trim(),
            title: row[parsed.headers.indexOf(detected.columns.title)]?.trim(),
            url: detected.columns.listingUrl
              ? row[parsed.headers.indexOf(detected.columns.listingUrl)]?.trim()
              : '',
          }))
          .filter((row) => row.id && !row.url && !/^[a-f0-9]{24}$/i.test(row.id));
      })()
    : [];
  async function upload(file?: File) {
    invalidate();
    setDetected(undefined);
    setCsv('');
    setUrls({});
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Use a CSV smaller than 10 MB.');
      const text = await file.text();
      const info = inspectPoshmarkCsv(text);
      parseInventoryCsv(text, info.headerRow);
      setCsv(text);
      setDetected(info);
      setSource(info.source);
      setCurrency(text.includes('https://poshmark.ca/') ? 'CAD' : 'USD');
      setCheckedAt(info.reportDate ? `${info.reportDate}T00:00` : '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read CSV.');
    }
  }
  async function preview() {
    invalidate();
    setBusy(true);
    try {
      if (!detected) throw new Error('Upload your exported inventory CSV first.');
      const timestamp = new Date(checkedAt);
      if (!checkedAt || !Number.isFinite(timestamp.getTime()) || timestamp.getTime() > Date.now())
        throw new Error('Enter a valid report time that is not in the future.');
      const mapping = poshmarkMappingSchema.parse({
        headerRow: detected.headerRow,
        columns: detected.columns,
        source,
        currency,
        region: currency === 'CAD' ? 'ca' : 'com',
        listingUrls: urls,
      });
      const result = convertPoshmarkInventory(csv, mapping, timestamp.toISOString());
      if (result.errors.length) throw new Error(result.errors.join('\n'));
      const existing = await fetchImportTargets(client);
      setTargets(existing);
      setRows(previewImport(result.envelope.products as PoshmarkRecord[], source, existing));
      setFeedback(
        `${result.summary.converted} listings ready for review. ${result.summary.skipped} repeated CSV records skipped. No data changed.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Preview failed.');
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!approved || busy || finished) return;
    const selectedIds = rows
      .filter((row) => row.choice !== 'skip' && row.target)
      .map((row) => publishedId(row.target!._id));
    if (new Set(selectedIds).size !== selectedIds.length) {
      setError('Two listings target the same item. Choose separate items or skip one.');
      return;
    }
    setBusy(true);
    setError('');
    const summary = { created: 0, updated: 0, skipped: 0, failed: 0 };
    const errors: string[] = [];
    for (const row of rows) {
      try {
        summary[await applyImport(client, row, source)]++;
      } catch (cause) {
        summary.failed++;
        errors.push(
          `${row.record.externalListingId}: ${cause instanceof Error ? cause.message : 'Import failed'}`,
        );
      }
    }
    setFeedback(
      `Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, failed ${summary.failed}. Successful changes are drafts: review and publish in Content. Nothing was published automatically.`,
    );
    setError(errors.join('\n'));
    setFinished(true);
    setApproved(false);
    setBusy(false);
    if (summary.created || summary.updated) onImported();
  }
  function choose(index: number, value: string) {
    setApproved(false);
    setRows((current) =>
      current.map((row, i) =>
        i !== index
          ? row
          : value.startsWith('link:')
            ? {
                ...row,
                choice: 'link',
                target: targets.find((item) => item._id === value.slice(5)),
              }
            : {
                ...row,
                choice: value as PreviewRow['choice'],
                target: value === 'create' ? undefined : row.target,
              },
      ),
    );
  }
  return (
    <>
      <Button ref={trigger} mode="ghost" text="Import Poshmark CSV" onClick={() => setOpen(true)} />
      {open && (
        <Dialog
          id="poshmark-import"
          header="Import Poshmark inventory"
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
                Upload your own official inventory export. Preview changes, match existing items,
                then import to drafts. Images are added separately in the product editor; no
                scraping or remote image fetching.
              </Text>
              <label>
                Inventory CSV{' '}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={(event) => void upload(event.currentTarget.files?.[0])}
                />
              </label>
              {detected && (
                <>
                  <Text size={1}>
                    Detected headings on row {detected.headerRow}. {missing.length} listings need a
                    URL.
                  </Text>
                  <label>
                    Import source (keep the same on future imports)
                    <TextInput
                      value={source}
                      disabled={busy}
                      onChange={(event) => {
                        invalidate();
                        setSource(event.currentTarget.value);
                      }}
                      placeholder="poshmark-yourusername"
                    />
                  </label>
                  <label>
                    Currency
                    <Select
                      value={currency}
                      disabled={busy}
                      onChange={(event) => {
                        invalidate();
                        setCurrency(event.currentTarget.value);
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="CAD">CAD</option>
                    </Select>
                  </label>
                  <label>
                    Report date and time (your local timezone)
                    <TextInput
                      type="datetime-local"
                      value={checkedAt}
                      disabled={busy}
                      onChange={(event) => {
                        invalidate();
                        setCheckedAt(event.currentTarget.value);
                      }}
                    />
                  </label>
                  <Text size={1}>
                    If the report gives only a date, midnight is a conservative default. Set the
                    actual export time if known. An older report never replaces newer imported data.
                  </Text>
                  {missing.map((row) => (
                    <label key={row.id}>
                      {row.id}: {row.title} — Poshmark listing URL
                      <TextInput
                        value={urls[row.id] || ''}
                        disabled={busy}
                        onChange={(event) => {
                          invalidate();
                          const value = event.currentTarget.value;
                          setUrls((current) => ({ ...current, [row.id]: value }));
                        }}
                      />
                    </label>
                  ))}
                  <Button
                    text={busy ? 'Working…' : 'Preview import'}
                    disabled={busy}
                    onClick={() => void preview()}
                  />
                </>
              )}
              {rows.length > 0 && (
                <>
                  <Text size={1}>
                    Matches by source/listing ID or listing URL update imported items. Similar
                    titles and SKUs are suggestions only. Manually matching switches that item to
                    Poshmark and enables future listing imports. Titles, descriptions, sizes,
                    photos, brands, SKUs, reviews and manual sale status are preserved. Missing
                    listings never become sold.
                  </Text>
                  <Box
                    overflow="auto"
                    role="region"
                    aria-label="Import preview; scroll horizontally on small screens"
                    tabIndex={0}
                  >
                    <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
                      <caption>Listing preview — {rows.length} records</caption>
                      <thead>
                        <tr>
                          {['Listing / description', 'Photos', 'Decision', 'Notes'].map((title) => (
                            <th key={title} scope="col" style={{ textAlign: 'left', padding: 12 }}>
                              {title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(page * pageSize, (page + 1) * pageSize).map((row, index) => (
                          <tr key={row.record.externalListingId}>
                            <td style={{ padding: 12 }}>
                              {row.record.externalListingId}
                              <br />
                              {row.record.title}
                              <br />
                              {row.record.currency} {row.record.listingPrice}
                            </td>
                            <td style={{ padding: 12 }}>
                              {row.target?.photos?.length
                                ? `${row.target.photos.length} kept`
                                : 'Missing — add in Studio'}
                            </td>
                            <td style={{ padding: 12 }}>
                              <Select
                                aria-label={`Decision for ${row.record.externalListingId}`}
                                disabled={busy || finished}
                                value={
                                  row.choice === 'link' ? `link:${row.target?._id}` : row.choice
                                }
                                onChange={(event) =>
                                  choose(page * pageSize + index, event.currentTarget.value)
                                }
                              >
                                <option value="skip">Skip</option>
                                <option value="create">Create new draft</option>
                                {row.choice === 'update' && (
                                  <option value="update">Update imported draft</option>
                                )}
                                {targets
                                  .filter((item) => eligible(item) && item.importEnabled !== false)
                                  .map((item) => (
                                    <option key={item._id} value={`link:${item._id}`}>
                                      Match: {item.sku || 'No SKU'} — {item.title || 'Untitled'}
                                    </option>
                                  ))}
                              </Select>
                            </td>
                            <td style={{ padding: 12 }}>
                              {row.note}
                              {row.candidates.length > 0 && (
                                <p>
                                  Possible matches:{' '}
                                  {row.candidates.map((item) => item.title || item.sku).join('; ')}
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
                  <Card padding={3} tone="caution">
                    <label>
                      <input
                        type="checkbox"
                        checked={approved}
                        disabled={busy || finished}
                        onChange={(event) => setApproved(event.currentTarget.checked)}
                      />{' '}
                      I reviewed the selected changes and any matches. Save to drafts only; I will
                      review and publish in Studio.
                    </label>
                  </Card>
                  <Button
                    tone="primary"
                    text={
                      busy
                        ? 'Importing…'
                        : `Confirm import (${rows.filter((row) => row.choice !== 'skip').length} changes)`
                    }
                    disabled={
                      !approved || busy || finished || !rows.some((row) => row.choice !== 'skip')
                    }
                    onClick={() => void confirm()}
                  />
                </>
              )}
              {error && (
                <Card tone="critical" padding={3}>
                  <div role="alert" style={{ whiteSpace: 'pre-wrap' }}>
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
