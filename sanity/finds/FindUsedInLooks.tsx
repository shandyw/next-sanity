'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, Stack, Text } from '@sanity/ui';
import { useClient, useFormValue } from 'sanity';
import { useRouter } from 'sanity/router';

type LookUsage = {
  _id: string;
  title?: string;
  items?: { find?: { _ref?: string }; placementRole?: string; role?: string }[];
};

export function FindUsedInLooks() {
  const documentId = useFormValue(['_id']) as string | undefined;
  const id = documentId?.replace(/^drafts\./, '');
  const client = useClient({ apiVersion: '2026-10-01' });
  const router = useRouter();
  const [looks, setLooks] = useState<LookUsage[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    client
      .withConfig({ perspective: 'raw', useCdn: false })
      .fetch<LookUsage[]>(
        '*[_type == "look" && (references($id) || references($draftId))]{_id,title,items[]{find,placementRole,role}}',
        { id, draftId: `drafts.${id}` },
      )
      .then((value) => {
        if (active) {
          setLooks(value);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [client, id]);

  if (!id) return null;
  return (
    <Card border padding={3} radius={2}>
      <Stack gap={3}>
        <Text size={2} weight="semibold">
          Used in Looks
        </Text>
        {error && <Text role="alert">Could not load linked Looks. Try reopening this Find.</Text>}
        {!error && !looks.length && <Text size={1}>No linked Looks.</Text>}
        {looks.map((look) => {
          const roles =
            look.items
              ?.filter((item) => [id, `drafts.${id}`].includes(item.find?._ref || ''))
              .map((item) =>
                item.placementRole === 'alternative' || item.role === 'alternative'
                  ? 'Alternative'
                  : 'Essential',
              ) || [];
          return (
            <Box key={look._id}>
              <Button
                mode="bleed"
                text={`${look.title || 'Untitled Look'} · ${look._id.startsWith('drafts.') ? 'Draft' : 'Published'} · ${roles.join(', ')}`}
                onClick={() =>
                  router.navigateIntent('edit', {
                    id: look._id.replace(/^drafts\./, ''),
                    type: 'look',
                  })
                }
              />
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}
