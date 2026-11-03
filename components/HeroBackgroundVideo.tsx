'use client';

import { useEffect, useRef } from 'react';

/** Decorative video: play only while the hero is visible and motion is allowed. */
export function HeroBackgroundVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const syncPlayback = () => {
      if (!visible || document.hidden || motion.matches) {
        video.pause();
        return;
      }
      void video.play().catch(() => {
        // Autoplay may be unavailable; the decorative background can stay still.
      });
    };
    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              syncPlayback();
            },
            { threshold: 0.1 },
          )
        : undefined;
    if (observer) observer.observe(video);
    else {
      visible = true;
      syncPlayback();
    }
    document.addEventListener('visibilitychange', syncPlayback);
    motion.addEventListener('change', syncPlayback);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      motion.removeEventListener('change', syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className="editorial-hero__background-video"
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      onError={(event) => {
        event.currentTarget.dataset.loadError = 'true';
      }}
    />
  );
}
