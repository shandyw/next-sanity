'use client';

import { Select } from '@sanity/ui';
import { set, type StringInputProps } from 'sanity';

export function CuratedReviewStatusInput(props: StringInputProps) {
  return (
    <Select
      {...props.elementProps}
      value={props.value === 'reviewed' ? 'reviewed' : 'not_reviewed'}
      disabled={props.readOnly}
      onChange={(event) => props.onChange(set(event.currentTarget.value))}
    >
      <option value="not_reviewed">Not reviewed</option>
      <option value="reviewed">Reviewed</option>
    </Select>
  );
}
