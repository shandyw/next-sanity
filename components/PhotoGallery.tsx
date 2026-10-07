'use client';
import { useState } from 'react';
export function PhotoGallery({
  photos,
  thumbnails,
  label = 'Review photographs',
}: {
  photos: React.ReactNode[];
  thumbnails: React.ReactNode[];
  label?: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <section className="review-detail__gallery" aria-label={label}>
      {photos.map((photo, i) => (
        <div key={i} hidden={active !== i}>
          {photo}
        </div>
      ))}
      {photos.length > 1 && (
        <div className="review-detail__thumbnails" role="group" aria-label="Choose photograph">
          {thumbnails.map((thumb, i) => (
            <button
              className="review-detail__thumbnail"
              key={i}
              type="button"
              aria-label={`Show photograph ${i + 1}`}
              aria-pressed={active === i}
              onClick={() => setActive(i)}
            >
              {thumb}
            </button>
          ))}
        </div>
      )}
      <p className="visually-hidden" role="status">
        Photograph {active + 1} of {photos.length}
      </p>
    </section>
  );
}
