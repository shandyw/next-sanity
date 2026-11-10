export type ShandyFit = {
  overallFit?: 'trueToSize' | 'runsSmall' | 'runsLarge' | 'mixed';
  stretchRating?: number;
  bustFit?: string;
  waistFit?: string;
  hipFit?: string;
  length?: string;
  sittingComfort?: string;
  movementComfort?: string;
  undergarments?: string;
  notes?: string;
};

export type ShannequinFit = {
  sizeDisplayed?: string;
  visualFit?: 'trueToSize' | 'snug' | 'loose' | 'mixed';
  bustFit?: string;
  waistFit?: string;
  hipFit?: string;
  garmentLength?: string;
  drape?: string;
  notes?: string;
};

export type FitCheck = {
  enabled?: boolean;
  testedBy?: 'shandy' | 'shannequin' | 'both';
  shandy?: ShandyFit;
  shannequin?: ShannequinFit;
  highlights?: string[];
};

export const shandyVerdicts = {
  trueToSize: 'True to size',
  runsSmall: 'Runs small',
  runsLarge: 'Runs large',
  mixed: 'Mixed fit',
} as const;
export const mannequinVerdicts = {
  trueToSize: 'True to size visually',
  snug: 'Appears snug',
  loose: 'Appears loose',
  mixed: 'Mixed visual fit',
} as const;
export const stretchLabels = [
  'Rigid / no stretch',
  'Slight stretch',
  'Moderate stretch',
  'Very stretchy',
  'High stretch',
] as const;
export const highlightLabels: Record<string, string> = {
  generousHipRoom: 'Generous hip room',
  snugWaistband: 'Snug waistband',
  bustFriendly: 'Bust-friendly',
  limitedBustRoom: 'Limited bust room',
  braFriendly: 'Bra-friendly',
  shapewearOptional: 'Shapewear optional',
  stretchyFabric: 'Stretchy fabric',
  minimalStretch: 'Minimal stretch',
  longerLength: 'Longer length',
  shorterLength: 'Shorter length',
  adjustableFit: 'Adjustable fit',
};

const hasText = (value?: string) => Boolean(value?.trim());
export function hasShandyAssessment(a?: ShandyFit) {
  return Boolean(
    a &&
    (a.overallFit ||
      [
        a.bustFit,
        a.waistFit,
        a.hipFit,
        a.length,
        a.sittingComfort,
        a.movementComfort,
        a.undergarments,
        a.notes,
      ].some(hasText) ||
      (Number.isInteger(a.stretchRating) && a.stretchRating! >= 1 && a.stretchRating! <= 5)),
  );
}
export function hasMannequinAssessment(b?: ShannequinFit) {
  return Boolean(
    b &&
    (hasText(b.sizeDisplayed) ||
      b.visualFit ||
      [b.bustFit, b.waistFit, b.hipFit, b.garmentLength, b.drape, b.notes].some(hasText)),
  );
}
export function usableFitCheck(value?: FitCheck) {
  if (!value?.enabled) return false;
  const shandy = value.testedBy === 'shandy' || value.testedBy === 'both';
  const mannequin = value.testedBy === 'shannequin' || value.testedBy === 'both';
  return (
    (shandy && hasShandyAssessment(value.shandy)) ||
    (mannequin && hasMannequinAssessment(value.shannequin))
  );
}
