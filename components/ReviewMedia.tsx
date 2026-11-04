'use client';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type PhotoItem = { label: string; content: ReactNode; thumbnail: ReactNode };

export function ReviewMedia({ items, video }: { items: PhotoItem[]; video?: ReactNode }) {
  const [active, setActive] = useState(0);
  const [videoOpen, setVideoOpen] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const watchButton = useRef<HTMLButtonElement>(null);
  const id = useId();

  function updateScrollControls() {
    const element = strip.current;
    if (!element) return;
    setCanScrollBack(element.scrollLeft > 2);
    setCanScrollForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
  }

  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const observer = new ResizeObserver(updateScrollControls);
    observer.observe(element);
    updateScrollControls();
    return () => observer.disconnect();
  }, [items.length]);

  function choose(index: number) {
    setActive(index);
    const element = strip.current;
    const thumbnail = element?.children[index] as HTMLElement | undefined;
    if (element && thumbnail) {
      const left = thumbnail.offsetLeft - element.offsetLeft;
      if (
        left < element.scrollLeft ||
        left + thumbnail.offsetWidth > element.scrollLeft + element.clientWidth
      )
        element.scrollTo({ left, behavior: 'smooth' });
    }
  }

  function closeVideo() {
    dialog.current?.querySelectorAll('video').forEach((player) => player.pause());
    setVideoOpen(false);
    watchButton.current?.focus();
  }

  return (
    <section className="review-story__media" aria-label="Review photos and video">
      {items.length > 0 && (
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
        </div>
      )}
      {video && (
        <>
          <button
            ref={watchButton}
            type="button"
            className="btn btn-accent review-story__watch"
            onClick={() => {
              setVideoOpen(true);
              dialog.current?.showModal();
            }}
          >
            Watch me try it on
          </button>
          <dialog
            ref={dialog}
            className="review-story__video-dialog"
            aria-label="Watch my try-on video"
            onClose={closeVideo}
            onClick={(event) => {
              if (event.target === dialog.current) dialog.current.close();
            }}
          >
            <div className="review-story__video-dialog-inner">
              <button
                type="button"
                className="review-story__video-close"
                aria-label="Close video"
                onClick={() => dialog.current?.close()}
              >
                ×
              </button>
              {videoOpen && video}
            </div>
          </dialog>
        </>
      )}
      <noscript>
        <style>
          {
            '.review-story__media-stage[hidden]{display:block!important;margin-top:16px}.review-story__thumbnails,.review-story__thumbnail-controls{display:none!important}'
          }
        </style>
        {video && <div className="review-story__video-fallback">{video}</div>}
      </noscript>
      {items.length > 1 && (
        <div className="review-story__thumbnail-gallery">
          <div
            ref={strip}
            className="review-story__thumbnails"
            role="group"
            aria-label="Choose review photograph"
            onScroll={updateScrollControls}
          >
            {items.map((item, index) => (
              <button
                type="button"
                className="review-story__thumbnail"
                key={index}
                aria-label={`Show photograph: ${item.label}`}
                aria-pressed={active === index}
                aria-controls={`${id}-${index}`}
                onClick={() => choose(index)}
              >
                {item.thumbnail}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          {items.length > 2 && (
            <div
              className="review-story__thumbnail-controls"
              aria-label="Browse review photographs"
            >
              <button
                type="button"
                aria-label="Previous photographs"
                disabled={!canScrollBack}
                onClick={() =>
                  strip.current?.scrollBy({ left: -strip.current.clientWidth, behavior: 'smooth' })
                }
              >
                ←
              </button>
              <button
                type="button"
                aria-label="Next photographs"
                disabled={!canScrollForward}
                onClick={() =>
                  strip.current?.scrollBy({ left: strip.current.clientWidth, behavior: 'smooth' })
                }
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
      {items.length > 0 && (
        <p className="visually-hidden" role="status" aria-atomic="true">
          {items[active]?.label} · Photograph {active + 1} of {items.length}
        </p>
      )}
    </section>
  );
}
