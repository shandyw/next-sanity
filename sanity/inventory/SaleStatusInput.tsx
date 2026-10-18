'use client';
import { Select, Stack, Text } from '@sanity/ui';
import { useDocumentOperation, useFormValue, type StringInputProps } from 'sanity';
import { publishedId } from './model';

export function SaleStatusInput(props: StringInputProps) {
  const id = useFormValue(['_id']) as string;
  const availability = useFormValue(['availability']) as string | undefined;
  const { patch } = useDocumentOperation(publishedId(id), 'product');
  return (
    <Stack gap={3}>
      <Select
        {...props.elementProps}
        value={props.value || ''}
        disabled={props.readOnly || Boolean(patch.disabled)}
        onChange={(event) => {
          const status = event.currentTarget.value;
          if (status) patch.execute([{ set: { saleStatus: status, availability: status } }]);
        }}
      >
        <option value="" disabled>
          Not assigned · legacy availability: {availability || 'unknown'}
        </option>
        <option value="available">Available</option>
        <option value="sold">Sold</option>
      </Select>
      <Text size={1}>
        Updates sale status and listing availability together in this draft. Publish the reviewed
        document to update the public listing.
      </Text>
    </Stack>
  );
}
