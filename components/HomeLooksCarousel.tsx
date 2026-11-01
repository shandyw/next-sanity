'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function carouselPosition(
  count: number,
  width: number,
  cardWidth: number,
  gap: number,
  scrollLeft: number,
) {
  const step = cardWidth + gap;
  const visible = step > 0 ? Math.max(1, Math.round((width + gap) / step)) : 1;
  const last = Math.max(0, count - visible);
  const index = Math.min(last, Math.max(0, step > 0 ? Math.round(scrollLeft / step) : 0));
  return { index, last };
}

export function HomeLooksCarousel({ children }: { children: React.ReactNode[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ index: 0, last: 0 });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track || !track.firstElementChild) return;
    const first = track.firstElementChild as HTMLElement;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    setPosition(
      carouselPosition(
        children.length,
        track.clientWidth,
        first.offsetWidth,
        gap,
        track.scrollLeft,
      ),
    );
  }, [children.length]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track || !track.firstElementChild) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const step = (track.firstElementChild as HTMLElement).offsetWidth + gap;
    const index = Math.min(position.last, Math.max(0, position.index + direction));
    track.scrollTo({
      left: index * step,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    setPosition((current) => ({ ...current, index }));
  }

  return (
    <div className="home-look-carousel">
      <ul className="home-look-carousel__track" ref={trackRef} onScroll={measure}>
        {children.map((child, index) => (
          <li className="home-look-carousel__slide" key={index}>
            {child}
          </li>
        ))}
      </ul>
      {position.last > 0 && (
        <div className="home-look-carousel__controls">
          <span className="home-look-carousel__position" aria-live="polite">
            {String(position.index + 1).padStart(2, '0')} /{' '}
            {String(position.last + 1).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={() => move(-1)}
            disabled={position.index === 0}
            aria-label="Previous Look"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            disabled={position.index === position.last}
            aria-label="Next Look"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </div>
  );
}
