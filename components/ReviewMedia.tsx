'use client';
import { useId, useRef, useState } from 'react';

export function ReviewMedia({
  items,
}: {
  items: { label: string; content: React.ReactNode; thumbnail: React.ReactNode; video?: boolean }[];
}) {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLElement>(null);
  const id = useId();
  const videoIndex = items.findIndex((item) => item.video);
  function choose(index: number) {
    root.current?.querySelectorAll('video').forEach((video) => video.pause());
    setActive(index);
  }
  return (
    <section className="review-story__media" aria-label="Review photos and videos" ref={root}>
      <div className="review-story__stage-wrap">
        {items.map((item, index) => (
          <div
            id={`${id}-${index}`}
            className="review-story__media-stage"
            key={index}
            hidden={active !== index}
          >
            {item.content}
          </div>
        ))}
        {videoIndex >= 0 && !items[active]?.video && (
          <button
            type="button"
            className="btn btn-accent review-story__watch"
            aria-controls={`${id}-${videoIndex}`}
            onClick={() => choose(videoIndex)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="m8 4 12 8-12 8Z" />
            </svg>
            Watch my try-on
          </button>
        )}
      </div>
      <noscript>
        <style>
          {
            '.review-story__media-stage[hidden]{display:block!important;margin-top:16px}.review-story__thumbnails,.review-story__watch{display:none!important}'
          }
        </style>
      </noscript>
      {items.length > 1 && (
        <div className="review-story__thumbnails" role="group" aria-label="Choose review media">
          {items.map((item, index) => (
            <button
              type="button"
              className="review-story__thumbnail"
              key={index}
              aria-label={`${item.video ? 'Watch video' : 'Show photograph'}: ${item.label}`}
              aria-pressed={active === index}
              aria-controls={`${id}-${index}`}
              onClick={() => choose(index)}
            >
              {item.thumbnail}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
      <p className="visually-hidden" role="status" aria-atomic="true">
        {items[active]?.label} · Media {active + 1} of {items.length}
      </p>
    </section>
  );
}
