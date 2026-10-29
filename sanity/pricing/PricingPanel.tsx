'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Grid,
  Heading,
  Select,
  Stack,
  Text,
  TextInput,
  TextArea,
} from '@sanity/ui';
import { useClient, useSource, type DocumentActionProps } from 'sanity';
import { IntentLink } from 'sanity/router';
import { INVENTORY_API_VERSION, inventoryPrice, publishedId } from '../inventory/model';
import {
  defaultInputs,
  defaultItemPricingInputs,
  pricingInputsSchema,
  type AnalysisRecord,
  type Comparable,
  type PricingData,
  type PricingInputs,
} from '@/lib/pricing/contracts';
import {
  eligibleItem,
  financials,
  itemAvailable,
  itemSold,
  marketWarning,
  moneyToCents,
} from '@/lib/pricing/engine';

function MoneyField({
  label,
  value,
  onChange,
  unknown = false,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  unknown?: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : (value / 100).toFixed(2));
  const [error, setError] = useState('');
  return (
    <label>
      <Stack gap={2}>
        <Text size={1}>
          {label}
          {unknown ? ' (blank = unknown)' : ''}
        </Text>
        <TextInput
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={unknown ? 'Unknown' : '0.00'}
          aria-invalid={!!error}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setText(next);
            try {
              const n = moneyToCents(next);
              if (n === null && !unknown) throw Error('Enter an amount; use 0 for no expense.');
              onChange(n);
              setError('');
              event.currentTarget.setCustomValidity('');
            } catch (e) {
              const message = (e as Error).message;
              setError(message);
              event.currentTarget.setCustomValidity(message);
            }
          }}
        />
        {error && <Text size={1}>{error}</Text>}
      </Stack>
    </label>
  );
}
function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
}) {
  return (
    <label>
      <Stack gap={2}>
        <Text size={1}>{label}</Text>
        {area ? (
          <TextArea value={value} rows={2} onChange={(e) => onChange(e.currentTarget.value)} />
        ) : (
          <TextInput value={value} onChange={(e) => onChange(e.currentTarget.value)} />
        )}
      </Stack>
    </label>
  );
}
export function PriceButton({ id, onApplied }: { id: string; onApplied?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button text="Price This Item" mode="ghost" fontSize={1} onClick={() => setOpen(true)} />
      {open && (
        <Dialog
          id={`price-${publishedId(id)}`}
          header="Price This Item"
          width={3}
          onClose={() => setOpen(false)}
        >
          <Box padding={4}>
            <PricingPanel id={id} onApplied={onApplied} />
          </Box>
        </Dialog>
      )}
    </>
  );
}
export function PriceDocumentAction(props: DocumentActionProps) {
  const [open, setOpen] = useState(false);
  const doc = props.draft || props.published;
  if (
    !doc ||
    !eligibleItem({
      shoppingSection: typeof doc.shoppingSection === 'string' ? doc.shoppingSection : undefined,
      affiliateLink: doc.affiliateLink === true,
    })
  )
    return null;
  return {
    label: 'Price This Item',
    onHandle: () => setOpen(true),
    dialog: open
      ? {
          type: 'dialog' as const,
          header: 'Price This Item',
          width: 'large' as const,
          onClose: () => setOpen(false),
          content: (
            <Box padding={4}>
              <PricingPanel id={props.id} />
            </Box>
          ),
        }
      : undefined,
  };
}
export function PricingPanel({ id, onApplied }: { id: string; onApplied?: () => void }) {
  const source = useSource();
  const client = useClient({ apiVersion: INVENTORY_API_VERSION });
  const [token, setToken] = useState<string | null>(() =>
    typeof client.config().token === 'string' ? (client.config().token as string) : null,
  );
  useEffect(() => {
    const subscription = source.auth.token?.subscribe((value) => setToken(value));
    return () => subscription?.unsubscribe();
  }, [source.auth]);
  const [data, setData] = useState<PricingData | null>(null);
  const [inputs, setInputs] = useState<PricingInputs>(defaultInputs);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [analysisInputs, setAnalysisInputs] = useState('');
  const [chosen, setChosen] = useState<number | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sale, setSale] = useState({
    saleCents: 0,
    soldAt: new Date().toISOString().slice(0, 10),
    listedAt: '',
    acquisitionCents: null as number | null,
    expensesCents: null as number | null,
  });
  const form = useRef<HTMLFormElement>(null);
  const currencyRef = useRef<string | undefined>(undefined);
  const endpoint = `/api/studio/pricing/${encodeURIComponent(publishedId(id))}`;
  const api = useCallback(
    async (body?: unknown, cursor?: string) => {
      if (!token)
        throw Error(
          'A Studio user token is required. Sign in again using token login to use pricing.',
        );
      const response = await fetch(
        endpoint + (cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''),
        {
          method: body ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          cache: 'no-store',
          signal: AbortSignal.timeout(90000),
        },
      );
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Pricing request failed.');
      return result;
    },
    [token, endpoint],
  );
  const reload = useCallback(
    async (reset = true) => {
      const result = (await api()) as PricingData;
      if (currencyRef.current && currencyRef.current !== result.item.currency) {
        setInputs(defaultItemPricingInputs());
        setChosen(
          typeof result.item.listingPrice === 'number'
            ? Math.round(result.item.listingPrice * 100)
            : null,
        );
        setReviewed(false);
      }
      currencyRef.current = result.item.currency;
      setData(result);
      if (reset) {
        setInputs(result.inputs);
        setAnalysis(result.latest);
        setAnalysisInputs(JSON.stringify(result.inputs));
        setChosen(
          typeof result.item.listingPrice === 'number'
            ? Math.round(result.item.listingPrice * 100)
            : null,
        );
      }
      return result;
    },
    [api],
  );
  useEffect(() => {
    if (!token) return;
    let active = true;
    void api()
      .then((result: PricingData) => {
        if (active) {
          currencyRef.current = result.item.currency;
          setData(result);
          setInputs(result.inputs);
          const recent = result.latest;
          setAnalysis(recent);
          setAnalysisInputs(JSON.stringify(recent?.inputs || result.inputs));
          setChosen(
            typeof result.item.listingPrice === 'number'
              ? Math.round(result.item.listingPrice * 100)
              : null,
          );
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [api, token]);
  async function run(action: 'analyze' | 'apply' | 'sale') {
    if (!form.current?.reportValidity()) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const parsed = pricingInputsSchema.parse(inputs);
      const body =
        action === 'analyze'
          ? {
              action,
              requestId: crypto.randomUUID(),
              expectedRevision: data!.item._rev,
              inputs: parsed,
            }
          : action === 'apply'
            ? {
                action,
                requestId: crypto.randomUUID(),
                expectedRevision: data!.item._rev,
                inputs: parsed,
                analysisId: analysis!._id,
                chosenCents: chosen,
                reviewedOutdated: reviewed,
                approved: true,
              }
            : { action, requestId: crypto.randomUUID(), ...sale };
      const result = await api(body);
      if (action === 'analyze') {
        setAnalysis(result);
        setAnalysisInputs(JSON.stringify(parsed));
        setChosen(result.assessment.listingCents ?? chosen);
        setReviewed(false);
        setMessage('Analysis saved privately. Asking price has not changed.');
        await reload(false);
      } else if (action === 'apply') {
        setMessage(result.message || 'This approval is already applied. Refresh the draft.');
        await reload(false);
        onApplied?.();
      } else {
        setMessage('Actual sale recorded privately. Asking price has not changed.');
        await reload(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check the pricing inputs and try again.');
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <Card padding={3} tone="caution">
        <Text>
          Waiting for your authenticated Studio token. If this persists, sign out and sign in again.
        </Text>
      </Card>
    );
  if (!data)
    return (
      <Stack gap={3}>
        <Text>{error || 'Loading private pricing…'}</Text>
        <Button
          text="Retry"
          mode="ghost"
          onClick={() => {
            setError('');
            void reload().catch((e) => setError(e.message));
          }}
        />
      </Stack>
    );
  const item = data.item;
  const currency = item.currency!;
  const format = (n: number | null) =>
    n === null ? 'Unavailable' : inventoryPrice(n / 100, currency);
  const formatAssessment = (n: number | null) =>
    n === null ? 'Unavailable' : inventoryPrice(n / 100, analysis?.product.currency || currency);
  const currencyChanged = !!analysis && analysis.product.currency !== currency;
  const validated = pricingInputsSchema.safeParse(inputs);
  const validInputs = validated.success ? validated.data : null;
  const numbers = validInputs
    ? financials(validInputs, chosen || 0)
    : { floorCents: null, netCents: null, profitCents: null, belowFloor: false };
  const stale =
    !!analysis &&
    (analysisInputs !== JSON.stringify(inputs) || analysis.product._rev !== item._rev);
  const update = <K extends keyof PricingInputs>(key: K, value: PricingInputs[K]) => {
    setInputs((old) => ({ ...old, [key]: value }));
    setReviewed(false);
  };
  const updateComp = (index: number, fields: Partial<Comparable>) =>
    update(
      'comparables',
      inputs.comparables.map((c, i) => (i === index ? { ...c, ...fields } : c)),
    );
  const amountFields = [
    ['cleaningCents', 'Cleaning and repair'],
    ['packagingCents', 'Packaging'],
    ['shippingCents', 'Seller-paid shipping'],
    ['promotionCents', 'Promotion'],
    ['overheadCents', 'Labor / overhead allowance'],
    ['desiredProfitCents', 'Minimum desired profit'],
    ['fixedFeeCents', 'Fixed seller fee'],
  ] as const;
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        void run('analyze');
      }}
    >
      <Stack gap={5}>
        <Card tone="caution" padding={3}>
          <Text size={1}>
            Private pricing · {currency}. Before tax. Unknown acquisition cost is not zero. Enter
            all applicable expenses; unentered taxes, returns and other costs are excluded. A
            confirmed sold comparable requires the actual accepted price, not just a Sold listing
            label.
          </Text>
        </Card>
        <section aria-labelledby="pricing-item">
          <Stack gap={3}>
            <Heading as="h2" id="pricing-item" size={1}>
              1. Item details
            </Heading>
            <Text>
              {item.sku || 'No SKU'} · {item.title || 'Untitled'} ·{' '}
              {item.brandName || 'Unknown brand'} · Size {item.size || 'unknown'} ·{' '}
              {item.condition || 'Condition unknown'}
            </Text>
            <Text size={1}>
              {item.description || 'No description'} · {item.categories?.join(', ')}
            </Text>
            <Text size={1}>{[item.styleModel, item.wearNotes].filter(Boolean).join(' · ')}</Text>
            <Flex gap={2} wrap="wrap">
              {item.imageUrls?.map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`${item.title || 'Closet item'} — photo ${i + 1}`}
                  width={120}
                  height={120}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
              ))}
            </Flex>
            <IntentLink intent="edit" params={{ id: publishedId(item._id), type: 'product' }}>
              Edit the existing Shopping item details and photos
            </IntentLink>
            <Button
              type="button"
              mode="ghost"
              text="Reload item details and history"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void reload(false)
                  .then(() => setReviewed(false))
                  .catch((e) => setError(e.message))
                  .finally(() => setBusy(false));
              }}
            />
          </Stack>
        </section>
        <section aria-labelledby="pricing-costs">
          <Stack gap={3}>
            <Heading as="h2" id="pricing-costs" size={1}>
              2. Costs and selling goal
            </Heading>
            <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
              <MoneyField
                key={`acquisition-${data.item._id}-${currency}`}
                label={`Acquisition cost (${currency})`}
                value={inputs.acquisitionCents}
                unknown
                onChange={(n) => update('acquisitionCents', n)}
              />
              {amountFields.map(([key, label]) => (
                <MoneyField
                  key={`${key}-${currency}`}
                  label={`${label} (${currency})`}
                  value={inputs[key]}
                  onChange={(n) => update(key, n || 0)}
                />
              ))}
              <label>
                <Stack gap={2}>
                  <Text size={1}>Seller percentage fee (basis points: 100 = 1%)</Text>
                  <TextInput
                    type="number"
                    min={0}
                    max={9999}
                    step={1}
                    required
                    value={inputs.sellerFeeBps}
                    onChange={(e) => update('sellerFeeBps', Number(e.currentTarget.value))}
                  />
                </Stack>
              </label>
              <Field
                label="Selling channel"
                value={inputs.channel}
                onChange={(v) => update('channel', v)}
              />
              <label>
                <Stack gap={2}>
                  <Text size={1}>Selling goal</Text>
                  <Select
                    value={inputs.preference}
                    onChange={(e) =>
                      update('preference', e.currentTarget.value as PricingInputs['preference'])
                    }
                  >
                    <option value="quick">Quick sale</option>
                    <option value="balanced">Balanced</option>
                    <option value="wait">Willing to wait</option>
                  </Select>
                </Stack>
              </label>
              <label>
                <Stack gap={2}>
                  <Text size={1}>Inventory origin</Text>
                  <Select
                    value={inputs.ownership}
                    onChange={(e) =>
                      update('ownership', e.currentTarget.value as PricingInputs['ownership'])
                    }
                  >
                    <option value="personal">Personal closet item</option>
                    <option value="resale">Purchased for resale</option>
                  </Select>
                </Stack>
              </label>
            </Grid>
            <Field
              label="Fee assumptions / excluded costs"
              value={inputs.feeNotes}
              onChange={(v) => update('feeNotes', v)}
              area
            />
            <Text size={1}>
              Percentage applies to item price only, plus a fixed seller fee. Seller-paid shipping
              is an expense once; buyer-paid platform fees are not seller costs. Verify fees for
              your own channel and country.
            </Text>
          </Stack>
        </section>
        <section aria-labelledby="pricing-comps">
          <Stack gap={3}>
            <Heading as="h2" id="pricing-comps" size={1}>
              3. Comparable listings
            </Heading>
            {inputs.comparables.map((c, index) => (
              <Card key={c.id} border padding={3}>
                <Stack gap={3}>
                  <Text weight="semibold">Comparable {index + 1}</Text>
                  <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
                    <Field
                      label="Marketplace / source"
                      value={c.source}
                      onChange={(v) => updateComp(index, { source: v })}
                    />
                    <Field
                      label="Source URL (optional HTTPS)"
                      value={c.url}
                      onChange={(v) => updateComp(index, { url: v })}
                    />
                    <Field
                      label="Description / item type"
                      value={c.description}
                      onChange={(v) => updateComp(index, { description: v })}
                    />
                    <Field
                      label="Brand / model"
                      value={c.brandModel}
                      onChange={(v) => updateComp(index, { brandModel: v })}
                    />
                    <Field
                      label="Size"
                      value={c.size}
                      onChange={(v) => updateComp(index, { size: v })}
                    />
                    <Field
                      label="Condition"
                      value={c.condition}
                      onChange={(v) => updateComp(index, { condition: v })}
                    />
                    <MoneyField
                      label="Comparable item price"
                      value={c.priceCents}
                      onChange={(n) => updateComp(index, { priceCents: n || 0 })}
                    />
                    <label>
                      Currency
                      <Select
                        value={c.currency}
                        onChange={(e) =>
                          updateComp(index, {
                            currency: e.currentTarget.value as Comparable['currency'],
                          })
                        }
                      >
                        {['USD', 'GBP', 'EUR', 'CAD', 'AUD', 'PLN', 'CZK', 'SEK', 'DKK'].map(
                          (v) => (
                            <option key={v}>{v}</option>
                          ),
                        )}
                      </Select>
                    </label>
                    <label>
                      Evidence type
                      <Select
                        value={c.kind}
                        onChange={(e) =>
                          updateComp(index, { kind: e.currentTarget.value as Comparable['kind'] })
                        }
                      >
                        <option value="asking">Asking price</option>
                        <option value="confirmedSold">Confirmed accepted sale price</option>
                      </Select>
                    </label>
                    <MoneyField
                      label="Comparable shipping"
                      value={c.shippingCents}
                      unknown
                      onChange={(n) => updateComp(index, { shippingCents: n })}
                    />
                    <label>
                      Observed date
                      <TextInput
                        type="date"
                        value={c.observedAt}
                        onChange={(e) => updateComp(index, { observedAt: e.currentTarget.value })}
                      />
                    </label>
                    <label>
                      Sale date (if known)
                      <TextInput
                        type="date"
                        value={c.soldAt}
                        onChange={(e) => updateComp(index, { soldAt: e.currentTarget.value })}
                      />
                    </label>
                  </Grid>
                  <Field
                    label="Relevant differences / shipping notes"
                    value={c.differences}
                    onChange={(v) => updateComp(index, { differences: v })}
                    area
                  />
                  <label>
                    <Checkbox
                      checked={c.relevant}
                      onChange={(e) => updateComp(index, { relevant: e.currentTarget.checked })}
                    />{' '}
                    I consider this a relevant comparison
                  </label>
                  <Button
                    type="button"
                    mode="ghost"
                    text="Remove comparable"
                    onClick={() =>
                      update(
                        'comparables',
                        inputs.comparables.filter((_, i) => i !== index),
                      )
                    }
                  />
                </Stack>
              </Card>
            ))}
            <Button
              type="button"
              mode="ghost"
              text="Add manual comparable"
              disabled={inputs.comparables.length >= 30 || busy}
              onClick={() =>
                update('comparables', [
                  ...inputs.comparables,
                  {
                    id: crypto.randomUUID(),
                    source: '',
                    url: '',
                    description: '',
                    brandModel: '',
                    size: '',
                    condition: '',
                    priceCents: 0,
                    currency: currency as Comparable['currency'],
                    kind: 'asking',
                    shippingCents: null,
                    observedAt: new Date().toISOString().slice(0, 10),
                    soldAt: '',
                    differences: '',
                    relevant: false,
                  },
                ])
              }
            />
            {data.ownSales.length > 0 && (
              <label>
                Your recorded sales (50 most recent)
                <Select
                  value=""
                  disabled={inputs.comparables.length >= 30}
                  onChange={(e) => {
                    const record = data.ownSales.find((s) => s._id === e.currentTarget.value);
                    if (
                      record &&
                      !inputs.comparables.some((c) => c.id === `own-sale:${record._id}`)
                    )
                      update('comparables', [
                        ...inputs.comparables,
                        {
                          id: `own-sale:${record._id}`,
                          source: 'Own recorded sale',
                          url: '',
                          description:
                            record.product.description || record.product.title || 'Own item',
                          brandModel: record.product.brandName || '',
                          size: record.product.size || '',
                          condition: record.product.condition || '',
                          priceCents: record.saleCents,
                          currency: record.product.currency as Comparable['currency'],
                          kind: 'confirmedSold',
                          shippingCents: null,
                          observedAt: record.soldAt,
                          soldAt: record.soldAt,
                          differences: 'Confirm relevance and differences before using.',
                          relevant: false,
                        },
                      ]);
                  }}
                >
                  <option value="">Add a recorded sale as evidence</option>
                  {data.ownSales
                    .filter((s) => s.productId !== publishedId(item._id))
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.product.title} · {s.soldAt} ·{' '}
                        {inventoryPrice(s.saleCents / 100, s.product.currency)}
                      </option>
                    ))}
                </Select>
              </label>
            )}
          </Stack>
        </section>
        <section aria-labelledby="pricing-recommendation">
          <Stack gap={3}>
            <Heading as="h2" id="pricing-recommendation" size={1}>
              4. Recommendation and offer calculator
            </Heading>
            {!data.aiReady && (
              <Card padding={3} tone="caution">
                <Text>
                  AI setup required: OPENAI_API_KEY and PRICING_AI_MODEL. Calculators and existing
                  history remain available; no mocked recommendation is shown.
                </Text>
              </Card>
            )}
            <Button
              type="submit"
              text={busy ? 'Working…' : 'Generate private assessment'}
              disabled={busy || !data.aiReady}
            />
            {analysis && (
              <Card border padding={3}>
                <Stack gap={3}>
                  <Text weight="semibold">
                    {analysis.confidence === 'limited'
                      ? 'Preliminary estimate—limited market evidence'
                      : `${analysis.confidence} evidence confidence`}
                  </Text>
                  <Text>
                    Suggested listing: {formatAssessment(analysis.assessment.listingCents)} · Quick
                    sale: {formatAssessment(analysis.assessment.quickCents)}
                  </Text>
                  <Text>
                    Estimated selling range: {formatAssessment(analysis.assessment.lowCents)} –{' '}
                    {formatAssessment(analysis.assessment.highCents)}
                  </Text>
                  <Text size={1}>{analysis.assessment.explanation}</Text>
                  <Text size={1}>
                    Analyzed {new Date(analysis.analyzedAt).toLocaleString()} · {analysis.provider}{' '}
                    / {analysis.model}
                  </Text>
                  {analysis.assessment.features.map((v, i) => (
                    <Text key={`feature-${i}`} size={1}>
                      {v}
                    </Text>
                  ))}
                  {analysis.assessment.warnings.map((v, i) => (
                    <Text key={`warning-${i}`} size={1}>
                      {v}
                    </Text>
                  ))}
                  {analysis.assessment.evidence.map((e) => (
                    <Text key={e.id} size={1}>
                      {inputs.comparables.find((c) => c.id === e.id)?.source || e.id}:{' '}
                      {e.relevant ? 'Relevant' : 'Weak comparison'} — {e.reason}
                    </Text>
                  ))}
                  {!currencyChanged &&
                    validInputs &&
                    marketWarning(validInputs, analysis.assessment) && (
                      <Text weight="semibold">
                        {validInputs && marketWarning(validInputs, analysis.assessment)}
                      </Text>
                    )}
                  {!currencyChanged &&
                    validInputs &&
                    analysis.assessment.quickCents !== null &&
                    financials(validInputs, analysis.assessment.quickCents).belowFloor && (
                      <Text weight="semibold">Quick-sale price is below your profit floor.</Text>
                    )}
                </Stack>
              </Card>
            )}
            <MoneyField
              key={`chosen-${analysis?._id || 'initial'}-${data.item._id}-${currency}`}
              label={`Chosen price / offer calculator (${currency})`}
              value={chosen}
              unknown
              onChange={setChosen}
            />
            <Text>
              Minimum acceptable offer: {format(numbers.floorCents)} · Net proceeds{' '}
              {inputs.ownership === 'personal' ? '(cash recovered after selling expenses)' : ''}:{' '}
              {format(chosen === null ? null : numbers.netCents)} · Profit after acquisition:{' '}
              {format(chosen === null ? null : numbers.profitCents)}
            </Text>
            {inputs.acquisitionCents === null && (
              <Text>
                Acquisition cost is unknown. Full profit and a reliable profit floor are
                unavailable.
              </Text>
            )}
            {numbers.belowFloor && chosen !== null && (
              <Text weight="semibold">This chosen price / offer is below your profit floor.</Text>
            )}
            {stale && (
              <Card tone="caution" padding={3}>
                <Stack gap={3}>
                  <Text>
                    {currencyChanged
                      ? 'Currency changed: old costs are not reused. Re-enter costs and regenerate in the new currency. No conversion is performed.'
                      : 'Recommendation is outdated. Regenerate or review the changed inputs explicitly.'}
                  </Text>
                  <label>
                    <Checkbox
                      checked={reviewed}
                      onChange={(e) => setReviewed(e.currentTarget.checked)}
                    />{' '}
                    I reviewed the outdated recommendation against the current item and costs.
                  </label>
                </Stack>
              </Card>
            )}
            <Button
              type="button"
              text="Apply Price to Draft"
              disabled={
                busy ||
                !analysis ||
                chosen === null ||
                !itemAvailable(item) ||
                !validInputs ||
                currencyChanged ||
                (stale && !reviewed)
              }
              onClick={() => void run('apply')}
            />
            <Text size={1}>
              {itemAvailable(item)
                ? 'Applies only the existing listing price/currency to a draft. Review and publish in Studio. Update your Vinted listing manually.'
                : 'Price updates are disabled until this item is explicitly marked Available through the existing workflow.'}
            </Text>
          </Stack>
        </section>
        <section aria-labelledby="pricing-history">
          <Stack gap={3}>
            <Heading as="h2" id="pricing-history" size={1}>
              5. Pricing history and actual sales
            </Heading>
            {!data.history.length && <Text>No private pricing history yet.</Text>}
            {data.history.map((record) => (
              <details key={record._id}>
                <summary>
                  {new Date(record.analyzedAt).toLocaleString()} · {record.confidence} ·{' '}
                  {record.provider}/{record.model}
                </summary>
                <Button
                  type="button"
                  mode="ghost"
                  text="Review this analysis"
                  onClick={() => {
                    setAnalysis(record);
                    setAnalysisInputs(JSON.stringify(record.inputs));
                    setReviewed(false);
                    setChosen(record.assessment.listingCents);
                  }}
                />
                <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 12 }}>
                  {JSON.stringify(
                    { inputs: record.inputs, item: record.product, assessment: record.assessment },
                    null,
                    2,
                  )}
                </pre>
              </details>
            ))}
            {data.nextCursor && (
              <Button
                type="button"
                mode="ghost"
                text="Load more history"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void api(undefined, data.nextCursor!)
                    .then((next: PricingData) =>
                      setData({
                        ...data,
                        history: [...data.history, ...next.history],
                        nextCursor: next.nextCursor,
                      }),
                    )
                    .catch((e) => setError(e.message))
                    .finally(() => setBusy(false));
                }}
              />
            )}
            {data.approvals.map((a) => (
              <Text key={a._id} size={1}>
                Approval {new Date(a.approvedAt).toLocaleString()}:{' '}
                {inventoryPrice(a.chosenCents / 100, a.currency)} · {a.state}
                {a.state === 'pending'
                  ? ' — check the draft before retrying; audit finalization may be incomplete.'
                  : ''}
              </Text>
            ))}
            {data.sales.map((s) => (
              <Text key={s._id} size={1}>
                Actual sale {s.soldAt}: {inventoryPrice(s.saleCents / 100, s.product.currency)} ·
                Net proceeds:{' '}
                {s.netCents === null
                  ? 'Unavailable'
                  : inventoryPrice(s.netCents / 100, s.product.currency)}{' '}
                · Realized profit:{' '}
                {s.profitCents === null
                  ? 'Unavailable'
                  : inventoryPrice(s.profitCents / 100, s.product.currency)}{' '}
                (before tax)
              </Text>
            ))}
            {itemSold(item) && (
              <Stack gap={3}>
                <Text weight="semibold">
                  Record an actual sale (private; separate from asking price)
                </Text>
                <Grid gridTemplateColumns={[1, 1, 2]} gap={3}>
                  <MoneyField
                    label={`Actual sale price (${currency})`}
                    value={sale.saleCents}
                    onChange={(n) => setSale({ ...sale, saleCents: n || 0 })}
                  />
                  <MoneyField
                    label="Actual selling expenses including all seller fees, shipping and allowances"
                    value={sale.expensesCents}
                    unknown
                    onChange={(n) => setSale({ ...sale, expensesCents: n })}
                  />
                  <MoneyField
                    label="Actual acquisition cost"
                    value={sale.acquisitionCents}
                    unknown
                    onChange={(n) => setSale({ ...sale, acquisitionCents: n })}
                  />
                  <label>
                    Sale date
                    <TextInput
                      type="date"
                      required
                      value={sale.soldAt}
                      onChange={(e) => setSale({ ...sale, soldAt: e.currentTarget.value })}
                    />
                  </label>
                  <label>
                    Listing date (if known)
                    <TextInput
                      type="date"
                      value={sale.listedAt}
                      onChange={(e) => setSale({ ...sale, listedAt: e.currentTarget.value })}
                    />
                  </label>
                </Grid>
                <Button
                  type="button"
                  text="Record actual sale"
                  disabled={busy}
                  onClick={() => void run('sale')}
                />
              </Stack>
            )}
          </Stack>
        </section>
        {error && (
          <Card role="alert" tone="critical" padding={3}>
            <Text>{error}</Text>
          </Card>
        )}
        <div role="status" aria-live="polite">
          {busy ? 'Working…' : message}
        </div>
      </Stack>
    </form>
  );
}
