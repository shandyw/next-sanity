'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
export function ImageCarousel({
  images,
  title,
  href,
  children,
}: {
  images: React.ReactNode[];
  title: string;
  href?: string;
  children?: React.ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const activeIndex = useRef(0);
  const [active, setActive] = useState(0);
  const multiple = images.length > 1;
  function keyboardIndex(key: string, current: number) {
    const next =
      key === 'ArrowRight'
        ? current + 1
        : key === 'ArrowLeft'
          ? current - 1
          : key === 'Home'
            ? 0
            : key === 'End'
              ? images.length - 1
              : undefined;
    return next === undefined ? undefined : Math.max(0, Math.min(images.length - 1, next));
  }
  function show(index: number) {
    const node = track.current;
    if (!node) return;
    node.scrollTo({
      left: Math.max(0, Math.min(images.length - 1, index)) * node.clientWidth,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let width = node.clientWidth;
    const observer = new ResizeObserver(() => {
      if (width === node.clientWidth) return;
      width = node.clientWidth;
      node.scrollTo({ left: activeIndex.current * width, behavior: 'instant' });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className={`review-card__media${multiple ? ' review-card__media--slider' : ''}`}
      role={multiple ? 'group' : undefined}
      aria-roledescription={multiple ? 'carousel' : undefined}
      aria-label={multiple ? `${title} photos` : undefined}
    >
      <div className="card-slider">
        <ul
          id={trackId}
          className="card-slider__track"
          ref={track}
          tabIndex={multiple ? 0 : undefined}
          aria-label={`${title} images`}
          onScroll={(event) => {
            const node = event.currentTarget;
            if (!node.clientWidth) return;
            const index = Math.max(
              0,
              Math.min(images.length - 1, Math.round(node.scrollLeft / node.clientWidth)),
            );
            const focused = document.activeElement;
            if (
              focused instanceof HTMLElement &&
              node.contains(focused) &&
              focused.closest('.card-slider__slide') !== node.children[index] &&
              focused !== node
            ) {
              node.focus({ preventScroll: true });
            }
            activeIndex.current = index;
            setActive(index);
          }}
          onKeyDown={(event) => {
            const index = keyboardIndex(event.key, active);
            if (!multiple || index === undefined) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            show(index);
          }}
        >
          {images.map((image, i) => (
            <li
              className="card-slider__slide"
              key={i}
              aria-label={`Image ${i + 1} of ${images.length}`}
              aria-hidden={i !== active ? true : undefined}
            >
              {href ? (
                <Link
                  className="review-card__media-link"
                  href={href}
                  tabIndex={i === active ? 0 : -1}
                  aria-label={`View ${title}, image ${i + 1}`}
                  draggable={false}
                >
                  {image}
                </Link>
              ) : (
                image
              )}
            </li>
          ))}
        </ul>
      </div>
      {multiple && (
        <>
          <div className="card-slider__dots" role="group" aria-label={`${title} photo controls`}>
            {images.map((_, i) => (
              <button
                key={i}
                className={`card-slider__dot${i === active ? ' is-active' : ''}`}
                type="button"
                aria-label={`Show image ${i + 1} of ${title}`}
                aria-pressed={active === i}
                aria-controls={trackId}
                onClick={() => show(i)}
                onKeyDown={(event) => {
                  const index = keyboardIndex(event.key, i);
                  if (index === undefined) return;
                  event.preventDefault();
                  const dots =
                    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                      'button',
                    );
                  dots?.[index]?.focus({ preventScroll: true });
                  show(index);
                }}
              />
            ))}
          </div>
          <p className="visually-hidden" role="status" aria-atomic="true">
            Image {active + 1} of {images.length}
          </p>
        </>
      )}
      {children}
    </div>
  );
}
