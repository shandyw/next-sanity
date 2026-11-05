/** Fictional editorial identities; these measurements guide imagery, not product fit. */
export const fashionModelSizes = [
  { title: 'US 16', value: '16' },
  { title: 'US 16/18', value: '16/18' },
  { title: 'US 18', value: '18' },
] as const;

export const fashionModelBodyShapes = [
  { title: 'Hourglass', value: 'hourglass' },
  { title: 'Pear', value: 'pear' },
  { title: 'Apple', value: 'apple' },
  { title: 'Rectangle', value: 'rectangle' },
  { title: 'Inverted Triangle', value: 'invertedTriangle' },
] as const;

export const fashionModelMeasurementLimits = {
  height: { min: 48, max: 84 },
  bust: { min: 20, max: 80 },
  waist: { min: 20, max: 70 },
  hips: { min: 20, max: 90 },
} as const;

export type FashionModelSize = (typeof fashionModelSizes)[number]['value'];
export type FashionModelBodyShape = (typeof fashionModelBodyShapes)[number]['value'];
export type FashionModelMeasurements = Record<keyof typeof fashionModelMeasurementLimits, number>;
export type FashionModelAppearance = {
  skinTone?: string;
  hairColor?: string;
  hairTexture?: string;
  hairstyle?: string;
  eyeColor?: string;
  ageAppearance?: string;
  facialFeatures?: string;
  otherCharacteristics?: string;
};

/** Shape returned by a future Sanity read; no generation provider is involved. */
export type AiFashionModel = {
  _id: string;
  name?: string;
  active?: boolean;
  clothingSize?: FashionModelSize;
  bodyShape?: FashionModelBodyShape;
  measurements?: Partial<FashionModelMeasurements>;
  appearance?: FashionModelAppearance;
  identityPrompt?: string;
  referenceImage?: { asset?: { _ref?: string } };
  referenceImageAlt?: string;
  referenceImageSource?: 'aiGenerated' | 'licensed';
  referenceImageRights?: string;
  referenceImageDescription?: string;
  referenceImageApproval?: 'draft' | 'approved';
};

export type EligibleAiFashionModel = AiFashionModel & {
  name: string;
  active: true;
  clothingSize: FashionModelSize;
  measurements: FashionModelMeasurements;
  identityPrompt: string;
  referenceImage: { asset: { _ref: string } };
  referenceImageAlt: string;
  referenceImageSource: 'aiGenerated' | 'licensed';
  referenceImageRights: string;
  referenceImageApproval: 'approved';
};

export function isEligibleFashionModel(model: AiFashionModel): model is EligibleAiFashionModel {
  const measurements = model.measurements;
  return (
    Boolean(model._id) &&
    !model._id.startsWith('drafts.') &&
    !model._id.startsWith('versions.') &&
    model.active === true &&
    Boolean(model.name?.trim()) &&
    fashionModelSizes.some(({ value }) => value === model.clothingSize) &&
    Boolean(measurements) &&
    Object.entries(fashionModelMeasurementLimits).every(([key, { min, max }]) => {
      const value = measurements?.[key as keyof FashionModelMeasurements];
      return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
    }) &&
    Boolean(model.identityPrompt?.trim() && model.identityPrompt.trim().length >= 40) &&
    Boolean(model.referenceImage?.asset?._ref) &&
    Boolean(model.referenceImageAlt?.trim()) &&
    (model.referenceImageSource === 'aiGenerated' || model.referenceImageSource === 'licensed') &&
    Boolean(model.referenceImageRights?.trim()) &&
    model.referenceImageApproval === 'approved'
  );
}

export type FashionModelSelection =
  | { ok: true; model: EligibleAiFashionModel }
  | { ok: false; reason: 'unavailable'; requestedId: string }
  | { ok: false; reason: 'empty' };

/** Call once per generation session and retain the returned model ID for all variations/retries. */
export function selectFashionModel(
  models: readonly AiFashionModel[],
  options: { modelId?: string; random?: () => number } = {},
): FashionModelSelection {
  const eligible = models.filter(isEligibleFashionModel);
  if (options.modelId !== undefined) {
    const selected = eligible.find((model) => model._id === options.modelId);
    return selected
      ? { ok: true, model: selected }
      : { ok: false, reason: 'unavailable', requestedId: options.modelId };
  }
  if (!eligible.length) return { ok: false, reason: 'empty' };
  const draw = (options.random || Math.random)();
  if (!Number.isFinite(draw) || draw < 0 || draw >= 1)
    throw new RangeError('Random source must return a number from 0 (inclusive) to 1 (exclusive).');
  return { ok: true, model: eligible[Math.floor(draw * eligible.length)] };
}
