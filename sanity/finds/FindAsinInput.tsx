'use client';

import { useEffect, useRef } from 'react';
import { set, useFormValue, type StringInputProps } from 'sanity';
import { asinToAutofill } from '../../lib/finds';

/** Keep the normal editable ASIN input, filling it only when no value exists. */
export function FindAsinInput(props: StringInputProps) {
  const { readOnly, value, onChange } = props;
  const amazonUrl = useFormValue(['amazonUrl']) as string | undefined;
  const affiliateUrl = useFormValue(['affiliateUrl']) as string | undefined;
  const lastUrls = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (readOnly) return;
    const urls = `${amazonUrl || ''}\0${affiliateUrl || ''}`;
    if (lastUrls.current === urls) return;
    lastUrls.current = urls;
    const extracted =
      asinToAutofill(amazonUrl || '', value) || asinToAutofill(affiliateUrl || '', value);
    if (extracted) onChange(set(extracted));
  }, [amazonUrl, affiliateUrl, value, readOnly, onChange]);

  return props.renderDefault(props);
}
