import {
  assessmentSchema,
  pricingInputsSchema,
  type Assessment,
  type PricingInputs,
  type PricingItem,
} from './contracts';
export function eligibleItem(item: Pick<PricingItem, 'shoppingSection' | 'affiliateLink'>) {
  return (
    (!item.shoppingSection || item.shoppingSection === 'closet') && item.affiliateLink !== true
  );
}
export function itemAvailable(item: PricingItem) {
  return (item.saleStatus || item.availability) === 'available';
}
export function itemSold(item: PricingItem) {
  return (item.saleStatus || item.availability) === 'sold';
}
export function sellerExpenses(inputs: PricingInputs) {
  return (
    inputs.cleaningCents +
    inputs.packagingCents +
    inputs.shippingCents +
    inputs.promotionCents +
    inputs.overheadCents
  );
}
export function financials(raw: PricingInputs, saleCents: number) {
  const inputs = pricingInputsSchema.parse(raw);
  if (!Number.isSafeInteger(saleCents) || saleCents < 0 || saleCents > 100_000_000)
    throw Error('Invalid sale amount');
  const denominator = BigInt(10000 - inputs.sellerFeeBps);
  const netCents =
    Number((BigInt(saleCents) * denominator) / 10000n) -
    inputs.fixedFeeCents -
    sellerExpenses(inputs);
  const acquisition = inputs.acquisitionCents;
  const floorCents =
    acquisition === null
      ? null
      : Number(
          (BigInt(
            acquisition + sellerExpenses(inputs) + inputs.fixedFeeCents + inputs.desiredProfitCents,
          ) *
            10000n +
            denominator -
            1n) /
            denominator,
        );
  return {
    netCents,
    profitCents: acquisition === null ? null : netCents - acquisition,
    floorCents,
    belowFloor: floorCents !== null && saleCents < floorCents,
  };
}
export function checkedAssessment(
  raw: unknown,
  inputs: PricingInputs,
  currency: string,
  now = Date.now(),
) {
  const result = assessmentSchema.parse(raw);
  const ids = new Set(inputs.comparables.map((c) => c.id));
  if (
    result.evidence.some((e) => !ids.has(e.id)) ||
    new Set(result.evidence.map((e) => e.id)).size !== result.evidence.length
  )
    throw Error('AI returned an invalid comparable reference');
  const usable = inputs.comparables.filter(
    (c) =>
      c.relevant &&
      c.currency === currency &&
      result.evidence.some((e) => e.id === c.id && e.relevant),
  );
  const recent = usable.filter(
    (c) =>
      now - Date.parse(c.observedAt) <= 180 * 86400000 &&
      Date.parse(c.observedAt) <= now &&
      (!c.soldAt || now - Date.parse(c.soldAt) <= 180 * 86400000),
  );
  const sales = recent.filter((c) => c.kind === 'confirmedSold');
  const confidence =
    sales.length >= 3 ? 'strong' : sales.length >= 1 || recent.length >= 3 ? 'moderate' : 'limited';
  if (!usable.length) {
    result.lowCents = result.highCents = result.listingCents = result.quickCents = null;
    result.warnings.push(
      'No relevant same-currency comparable evidence; market estimate unavailable.',
    );
  } else if (
    [result.lowCents, result.highCents, result.listingCents, result.quickCents].some(
      (v) => v === null,
    )
  ) {
    result.lowCents = result.highCents = result.listingCents = result.quickCents = null;
  } else if (result.lowCents! > result.highCents! || result.quickCents! > result.listingCents!)
    throw Error('AI returned an inconsistent selling range');
  if (confidence === 'limited')
    result.warnings.push('Preliminary estimate—limited market evidence');
  if (inputs.comparables.some((c) => c.currency !== currency))
    result.warnings.push('Different-currency comparables excluded. No currency conversion.');
  if (usable.some((c) => c.kind === 'asking'))
    result.warnings.push('Asking prices are not confirmed accepted sale prices.');
  if (
    usable.some((c) => c.shippingCents === null) ||
    new Set(usable.map((c) => c.shippingCents)).size > 1
  )
    result.warnings.push(
      'Shipping differs or is unknown; compare item prices separately and verify buyer totals.',
    );
  return { assessment: result, confidence } as {
    assessment: Assessment;
    confidence: 'limited' | 'moderate' | 'strong';
  };
}
export function marketWarning(inputs: PricingInputs, assessment: Assessment) {
  const floor = financials(inputs, 0).floorCents;
  return floor !== null && assessment.highCents !== null && assessment.highCents < floor
    ? 'Unlikely to meet your profit target at current market prices.'
    : '';
}
export function moneyToCents(value: string): number | null {
  if (!value) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(value))
    throw Error('Enter a nonnegative amount with at most two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(n) || n > 100_000_000) throw Error('Amount is too large.');
  return n;
}
