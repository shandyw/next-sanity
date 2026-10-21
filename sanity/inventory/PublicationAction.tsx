'use client';

import { useRef, useState } from 'react';
import { Box, Button, Card, Dialog, Flex, Stack, Text } from '@sanity/ui';
import { useDocumentPairPermissions } from 'sanity';
import { publishedId, type InventoryProduct, type PublicationMode } from './model';

export function PublicationAction({
  item,
  pending,
  onChange,
}: {
  item: InventoryProduct;
  pending: boolean;
  onChange: (item: InventoryProduct, mode: PublicationMode) => Promise<void>;
}) {
  const draft = item._id.startsWith('drafts.');
  const mode = draft ? 'publish' : 'unpublish';
  const label = draft ? 'Publish' : 'Set to Draft';
  const [permission, checking] = useDocumentPairPermissions({
    id: publishedId(item._id),
    type: 'product',
    permission: mode,
  });
  const [selected, setSelected] = useState<InventoryProduct>();
  const [error, setError] = useState('');
  const button = useRef<HTMLButtonElement>(null);
  function close() {
    if (pending) return;
    setSelected(undefined);
    requestAnimationFrame(() => button.current?.focus());
  }
  return (
    <>
      <Button
        ref={button}
        text={pending ? 'Working…' : label}
        aria-label={`${label}: ${item.title || item.sku || 'item'}`}
        mode="ghost"
        fontSize={1}
        disabled={pending || checking || !permission?.granted}
        onClick={() => {
          setError('');
          setSelected(item);
        }}
      />
      {!checking && !permission?.granted && (
        <Text size={0}>
          You do not have permission to {draft ? 'publish' : 'unpublish'} this item.
        </Text>
      )}
      {selected && (
        <Dialog
          id={`publication-${publishedId(item._id)}`}
          header={draft ? 'Publish item?' : 'Set item to Draft?'}
          width={1}
          onClose={close}
          onClickOutside={close}
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text>
                {draft
                  ? `Publish the complete current draft of “${selected.title || selected.sku || 'this item'}”, including any other draft edits? Required fields and validation must pass first.`
                  : `Remove “${selected.title || selected.sku || 'this item'}” from the public site and keep its content as an editable draft? Its Vinted listing will stay unchanged.`}
              </Text>
              {!draft && <Text>Public pages may take up to five minutes to refresh.</Text>}
              {error && (
                <Card tone="critical" padding={3} role="alert">
                  <Text size={1}>{error}</Text>
                </Card>
              )}
              <Flex gap={3} justify="flex-end">
                <Button text="Cancel" mode="ghost" onClick={close} disabled={pending} autoFocus />
                <Button
                  text={pending ? 'Working…' : label}
                  tone={draft ? 'positive' : 'caution'}
                  disabled={pending}
                  onClick={async () => {
                    setError('');
                    try {
                      await onChange(selected, mode);
                      setSelected(undefined);
                      requestAnimationFrame(() => button.current?.focus());
                    } catch (cause) {
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : 'Unable to change publication. Refresh and try again.',
                      );
                    }
                  }}
                />
              </Flex>
            </Stack>
          </Box>
        </Dialog>
      )}
    </>
  );
}
