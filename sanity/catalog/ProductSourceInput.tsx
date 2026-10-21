'use client';

import { Select } from '@sanity/ui';
import { useDocumentOperation, useFormValue, type StringInputProps } from 'sanity';
import { defaultPlacements, type CatalogSource } from '../../lib/catalog';
import { publishedId } from '../inventory/model';

export function ProductSourceInput(props: StringInputProps) {
  const id = useFormValue(['_id']) as string;
  const { patch } = useDocumentOperation(publishedId(id), 'product');

  return (
    <Select
      {...props.elementProps}
      value={props.value || ''}
      disabled={props.readOnly || Boolean(patch.disabled)}
      onChange={(event) => {
        const source = event.currentTarget.value as CatalogSource;
        if (source === 'closet' || source === 'amazon')
          patch.execute([{ set: { catalogSource: source, displayPlacements: defaultPlacements(source) } }]);
      }}
    >
      <option value="" disabled>
        Select product source
      </option>
      <option value="closet">Physical closet inventory</option>
      <option value="amazon">Amazon product</option>
    </Select>
  );
}
