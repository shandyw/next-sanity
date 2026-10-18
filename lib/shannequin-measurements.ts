/** Coordinates are percentages of the uncropped, full-body photograph. */
export const measurementAreas = [
  { id: 'chest', label: 'Chest', x: 38, y: 26, side: 'left' },
  { id: 'waist', label: 'Waist', x: 56, y: 30, side: 'left' },
  { id: 'hips', label: 'Hips', x: 36, y: 40, side: 'left' },
  { id: 'arm', label: 'Arm', x: 71, y: 23, side: 'right' },
  { id: 'wrist', label: 'Wrist', x: 71, y: 42, side: 'right' },
  { id: 'inseam', label: 'Inseam', x: 52, y: 55, side: 'right' },
] as const;
export type MeasurementArea = (typeof measurementAreas)[number]['id'];
export interface ShannequinMeasurement {
  label?: string;
  value?: number;
  unit?: 'in' | 'cm';
  description?: string;
}
export type ShannequinMeasurements = Partial<Record<MeasurementArea, ShannequinMeasurement>>;
export function measurementDisplay(measurement?: ShannequinMeasurement) {
  if (
    !measurement ||
    typeof measurement.value !== 'number' ||
    !Number.isFinite(measurement.value) ||
    measurement.value <= 0 ||
    !['in', 'cm'].includes(measurement.unit || '')
  ) {
    return 'Measurement coming soon';
  }
  const inches = measurement.unit === 'cm' ? measurement.value / 2.54 : measurement.value;
  const centimeters = measurement.unit === 'cm' ? measurement.value : measurement.value * 2.54;
  const format = (value: number) => Number(value.toFixed(1)).toString();
  return `${format(inches)} in / ${format(centimeters)} cm`;
}
