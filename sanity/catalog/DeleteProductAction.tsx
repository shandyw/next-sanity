'use client';
import { useState } from 'react';
import { Box, Button, Stack, Text } from '@sanity/ui';
import { useClient, useDocumentOperation, type DocumentActionProps } from 'sanity';
import { assertNoProductReferences } from './model';

/** Retains Sanity's permission and reference enforcement after our broader reference check. */
export function DeleteProductAction(props: DocumentActionProps) {
  const client = useClient({ apiVersion: '2026-10-01' });
  const operation = useDocumentOperation(props.id, props.type).delete;
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return {
    label: 'Delete permanently',
    tone: 'critical' as const,
    disabled: !!operation.disabled || pending,
    onHandle: () => {
      setError('');
      setOpen(true);
    },
    dialog: open
      ? {
          type: 'dialog' as const,
          header: 'Permanently delete product?',
          onClose: () => {
            if (!pending) setOpen(false);
          },
          content: (
            <Box padding={4}>
              <Stack gap={4}>
                <Text>
                  Archive is recommended. Deletion cannot discover browser-saved items. Reviews,
                  collections and other references must be resolved first.
                </Text>
                {error && <Text role="alert">{error}</Text>}
                <Button
                  text={pending ? 'Checking references…' : 'Delete permanently'}
                  tone="critical"
                  disabled={pending || !!operation.disabled}
                  onClick={async () => {
                    setPending(true);
                    setError('');
                    try {
                      await assertNoProductReferences(
                        client.withConfig({ perspective: 'raw', useCdn: false }),
                        props.id,
                      );
                      operation.execute();
                      setOpen(false);
                      props.onComplete();
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : 'Could not check references. Try again.',
                      );
                    } finally {
                      setPending(false);
                    }
                  }}
                />
              </Stack>
            </Box>
          ),
        }
      : undefined,
  };
}
DeleteProductAction.action = 'delete' as const;
