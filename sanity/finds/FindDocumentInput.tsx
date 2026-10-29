'use client';

import { useState } from 'react';
import { Box, Button, Card, Dialog, Stack, Text } from '@sanity/ui';
import { useClient, useFormValue, type ObjectInputProps } from 'sanity';
import { deleteFind } from './delete';

export function FindDocumentInput(props: ObjectInputProps) {
  const id = useFormValue(['_id']) as string | undefined;
  const publishedId = id?.replace(/^drafts\./, '') || '';
  const client = useClient({ apiVersion: '2026-10-01' });
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [deleted, setDeleted] = useState(false);

  const close = () => {
    if (!pending) setOpen(false);
  };

  return (
    <Stack gap={5}>
      <Card border padding={3} radius={2}>
        {deleted ? (
          <Text role="status">Find deleted.</Text>
        ) : (
          <Button
            text="Delete Find"
            tone="critical"
            mode="ghost"
            disabled={!id || pending}
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          />
        )}
      </Card>
      {props.renderDefault(props)}
      {open && (
        <Dialog
          id="delete-find-confirmation"
          header="Delete this Find?"
          onClose={close}
          onClickOutside={close}
          width={1}
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text>
                This removes the Find from linked Looks and permanently deletes it. This action
                cannot be undone.
              </Text>
              {error && <Text role="alert">{error}</Text>}
              <Button
                text={pending ? 'Deleting Find…' : 'Delete Find'}
                tone="critical"
                disabled={pending}
                onClick={async () => {
                  setPending(true);
                  setError('');
                  try {
                    await deleteFind(
                      client.withConfig({ perspective: 'raw', useCdn: false }),
                      publishedId,
                    );
                    setOpen(false);
                    setDeleted(true);
                  } catch (cause) {
                    setError(
                      cause instanceof Error ? cause.message : 'Could not delete Find. Try again.',
                    );
                  } finally {
                    setPending(false);
                  }
                }}
              />
            </Stack>
          </Box>
        </Dialog>
      )}
    </Stack>
  );
}
