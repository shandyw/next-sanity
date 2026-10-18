import test from 'node:test';
import assert from 'node:assert/strict';
import { measurementAreas, measurementDisplay } from '../lib/shannequin-measurements';

test('measurements derive both units without invented or zero values', () => {
  assert.equal(measurementDisplay({ value: 38, unit: 'in' }), '38 in / 96.5 cm');
  assert.equal(measurementDisplay({ value: 96.52, unit: 'cm' }), '38 in / 96.5 cm');
  for (const entry of [
    undefined,
    {},
    { value: 0, unit: 'in' as const },
    { value: NaN, unit: 'cm' as const },
    { value: 38 },
  ])
    assert.equal(measurementDisplay(entry), 'Measurement coming soon');
  assert.equal(new Set(measurementAreas.map((area) => area.id)).size, 6);
});
