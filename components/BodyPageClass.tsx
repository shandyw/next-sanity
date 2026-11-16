'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function BodyPageClass() {
  const pathname = usePathname();

  useEffect(() => {
    const name = pathname
      .split('/')
      .filter(Boolean)
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const pageClass = `page-${name || 'home'}`;
    document.body.classList.add(pageClass);
    return () => document.body.classList.remove(pageClass);
  }, [pathname]);

  return null;
}
