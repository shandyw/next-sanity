'use client';

import { useEffect, useRef } from 'react';

/** Progressive enhancement: the server-rendered composition is always visible. */
export function HeroEntrance({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const element = root.current;
    if (!element || played.current || typeof element.animate !== 'function') return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations: Animation[] = [];
    const cancel = () => animations.forEach((animation) => animation.cancel());
    const play = () => {
      if (played.current) return;
      played.current = true;
      if (reducedMotion.matches) return;

      const options = { easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' as const };
      if (window.matchMedia('(max-width: 767px)').matches) {
        animations.push(
          element.animate([{ opacity: 0 }, { opacity: 1 }], {
            ...options,
            duration: 300,
          }),
        );
        return;
      }

      const enter = (part: string, delay: number, duration: number, movement: string) => {
        element.querySelectorAll<HTMLElement>(`[data-hero-part="${part}"]`).forEach((item) => {
          const transform = getComputedStyle(item).transform;
          const finalTransform = transform === 'none' ? '' : transform;
          animations.push(
            item.animate(
              [
                { opacity: 0, transform: `${movement} ${finalTransform}`.trim() },
                { opacity: 1, transform: finalTransform || 'none' },
              ],
              { ...options, delay, duration },
            ),
          );
        });
      };

      enter('main-photo', 80, 550, 'translateY(20px)');
      enter('eyebrow', 160, 400, 'translateY(10px)');
      enter('heading', 160, 400, 'translateY(10px)');
      enter('small-photo', 220, 500, 'translateY(16px)');
      enter('description', 450, 350, 'translateY(8px)');
      enter('action', 450, 350, 'translateY(8px)');
    };

    const observer =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                play();
              }
            },
            { threshold: 0.15 },
          )
        : null;
    if (observer) observer.observe(element);
    else play();

    const onMotionChange = () => {
      if (reducedMotion.matches) cancel();
    };
    reducedMotion.addEventListener('change', onMotionChange);
    // A keyboard user can use the CTA immediately, even during its entrance.
    element.addEventListener('focusin', cancel);
    return () => {
      observer?.disconnect();
      cancel();
      reducedMotion.removeEventListener('change', onMotionChange);
      element.removeEventListener('focusin', cancel);
    };
  }, []);

  return (
    <div ref={root} className="container editorial-hero__inner">
      {children}
    </div>
  );
}
