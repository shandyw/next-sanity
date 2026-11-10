'use client';

import { useEffect, useRef } from 'react';
import { set, useClient, useFormValue, type StringInputProps } from 'sanity';

export function reviewTitleToAutofill(
  editorialTitle?: string,
  currentTitle?: string,
  titleWasEdited = false,
) {
  return !titleWasEdited && !currentTitle?.trim() && editorialTitle?.trim()
    ? editorialTitle.trim()
    : undefined;
}

export function ReviewTitleInput(props: StringInputProps) {
  const { value, readOnly, onChange } = props;
  const find = useFormValue(['primaryFind']) as { _ref?: string } | undefined;
  const findId = find?._ref;
  const client = useClient({ apiVersion: '2026-10-01' });
  const lastFind = useRef<string | undefined>(undefined);
  const titleWasEdited = useRef(Boolean(value?.trim()));

  // Once the editor has supplied a title, clearing it must not trigger another autofill.
  useEffect(() => {
    if (value?.trim()) titleWasEdited.current = true;
  }, [value]);

  useEffect(() => {
    if (readOnly || !findId || titleWasEdited.current || lastFind.current === findId) return;
    lastFind.current = findId;
    let active = true;
    const publishedId = findId.replace(/^drafts\./, '');
    client
      .fetch<string | null>(
        'coalesce(*[_id == $draftId][0].editorialTitle, *[_id == $id][0].editorialTitle)',
        { id: publishedId, draftId: `drafts.${publishedId}` },
        { perspective: 'raw' },
      )
      .then((editorialTitle) => {
        const suggested = reviewTitleToAutofill(
          editorialTitle || undefined,
          value,
          titleWasEdited.current,
        );
        if (active && suggested) {
          titleWasEdited.current = true;
          onChange(set(suggested));
        }
      })
      .catch(() => {
        // The title stays editable if the linked Find cannot be read.
      });
    return () => {
      active = false;
    };
  }, [client, findId, value, readOnly, onChange]);

  return props.renderDefault(props);
}
