'use client';

import { useEffect, useRef } from 'react';

export function ProductResults({
  resultKey,
  children,
}: {
  resultKey: string;
  children: React.ReactNode;
}) {
  const grid = useRef<HTMLUListElement>(null);
  const previousKey = useRef(resultKey);

  useEffect(() => {
    if (previousKey.current === resultKey) return;
    previousKey.current = resultKey;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const animation = grid.current?.animate(
      [
        { opacity: 0.35, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 220, easing: 'ease-out' },
    );
    return () => animation?.cancel();
  }, [resultKey]);

  return (
    <ul ref={grid} className="review-grid reviews-grid">
      {children}
    </ul>
  );
}
