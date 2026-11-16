'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

type Props = {
  active: string;
  options: Record<string, string>;
};

export function ShopOccasionDropdown({ active, options }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      const dropdown = ref.current;
      if (dropdown?.open && !event.composedPath().includes(dropdown)) dropdown.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);

  return (
    <div className="looks-archive__filter-dropdown">
      <span id="shop-occasion-label">Filter Looks by occasion</span>
      <details
        ref={ref}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && ref.current?.open) {
            event.preventDefault();
            ref.current.open = false;
            ref.current.querySelector('summary')?.focus();
          }
        }}
      >
        <summary aria-labelledby="shop-occasion-label shop-occasion-value">
          <span id="shop-occasion-value">{options[active] || 'All occasions'}</span>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m3 7 7 7 7-7" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </summary>
        <nav aria-label="Look occasions" className="looks-archive__filter-options">
          <Link href="/shop" aria-current={!active ? 'page' : undefined}>
            All occasions
          </Link>
          {Object.entries(options).map(([value, label]) => (
            <Link
              key={value}
              href={`/shop?occasion=${value}`}
              aria-current={active === value ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
      </details>
    </div>
  );
}
