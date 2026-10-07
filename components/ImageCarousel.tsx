'use client';
import { useRef, useState } from 'react';
export function ImageCarousel({
  images,
  title,
  href,
}: {
  images: React.ReactNode[];
  title: string;
  href?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  return (
    <div className={`review-card__media${images.length > 1 ? ' review-card__media--slider' : ''}`}>
      <div className="card-slider">
        <ul
          className="card-slider__track"
          ref={track}
          tabIndex={0}
          aria-label={`${title} image carousel`}
          onScroll={(e) =>
            setActive(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
          }
        >
          {images.map((image, i) => (
            <li
              className="card-slider__slide"
              key={i}
              aria-label={`Image ${i + 1} of ${images.length}`}
            >
              {href ? (
                <a href={href} tabIndex={-1} aria-hidden="true">
                  {image}
                </a>
              ) : (
                image
              )}
            </li>
          ))}
        </ul>
      </div>
      {images.length > 1 && (
        <div className="card-slider__dots" role="group" aria-label={`${title} photos`}>
          {images.map((_, i) => (
            <button
              key={i}
              className={`card-slider__dot${i === active ? ' is-active' : ''}`}
              type="button"
              aria-label={`Show image ${i + 1} of ${title}`}
              aria-pressed={active === i}
              onClick={() => {
                const node = track.current;
                if (node)
                  node.scrollTo({
                    left: i * node.clientWidth,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                      ? 'instant'
                      : 'smooth',
                  });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
