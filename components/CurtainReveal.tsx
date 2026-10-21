'use client';

import Image from 'next/image';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from 'react';

// Measured against the original 1536 × 1024 frame PNG, not its visible bounding box.
export const curtainApertures = {
  left: { left: 157 / 1536, top: 119 / 1024, width: 598 / 1536, height: 791 / 1024 },
  right: { left: 782 / 1536, top: 119 / 1024, width: 598 / 1536, height: 791 / 1024 },
};
const initial = 8;
const start = 782 / 1536;
const end = 1386 / 1536;
const anchor = 1442 / 1536;
const clamp = (value: number) => Math.min(100, Math.max(0, value));
const apertureStyle = (area: typeof curtainApertures.left): CSSProperties =>
  Object.fromEntries(Object.entries(area).map(([key, value]) => [key, `${value * 100}%`]));

/** Photos are server-rendered slots; this client component owns only the curtain interaction. */
export function CurtainReveal({
  leftPhoto,
  rightPhoto,
  interactive = true,
  leftPosition = '50% 50%',
  rightPosition = '50% 50%',
}: {
  leftPhoto: ReactNode;
  rightPhoto: ReactNode;
  interactive?: boolean;
  leftPosition?: string;
  rightPosition?: string;
}) {
  const [progress, setProgress] = useState(initial);
  const [used, setUsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const fabric = useRef<HTMLDivElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; value: number; width: number } | null>(null);
  const played = useRef(false);
  const cancelIntro = useRef<() => void>(() => {});
  const instruction = useId();
  const left = start + ((end - start) * progress) / 100;

  useEffect(() => {
    const element = root.current;
    if (!interactive || !element) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animations: Animation[] = [];
    const cancel = () => {
      played.current = true;
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
      animations = [];
    };
    cancelIntro.current = cancel;
    const play = () => {
      if (played.current) return;
      played.current = true;
      if (motion.matches) return;
      timer = setTimeout(() => {
        if (!fabric.current || !handle.current || motion.matches) return;
        const width = fabric.current.getBoundingClientRect().width;
        const options = { duration: 900, easing: 'ease-in-out' };
        animations = [
          fabric.current.animate(
            [
              { width: `${width}px` },
              { width: `${width - 16}px`, offset: 0.45 },
              { width: `${width}px` },
            ],
            options,
          ),
          handle.current.animate(
            [
              { transform: 'translate(-50%, -50%)' },
              { transform: 'translate(calc(-50% + 16px), -50%)', offset: 0.45 },
              { transform: 'translate(-50%, -50%)' },
            ],
            options,
          ),
        ];
      }, 600);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(element);
    const onMotionChange = () => {
      if (motion.matches) cancel();
    };
    motion.addEventListener('change', onMotionChange);
    // A resized composition must never retain pixel-sized introductory keyframes.
    const resize = new ResizeObserver(() => {
      if (animations.length) cancel();
    });
    resize.observe(element);
    return () => {
      observer.disconnect();
      resize.disconnect();
      clearTimeout(timer);
      animations.forEach((animation) => animation.cancel());
      motion.removeEventListener('change', onMotionChange);
      cancelIntro.current = () => {};
    };
  }, [interactive]);

  function adjust(value: number) {
    cancelIntro.current();
    const next = clamp(value);
    if (next !== progress) {
      setProgress(next);
      setUsed(true);
    }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!interactive || !event.isPrimary || event.button !== 0 || !root.current) return;
    cancelIntro.current();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      value: progress,
      width: root.current.getBoundingClientRect().width,
    };
    setDragging(true);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    adjust(active.value + ((event.clientX - active.x) / (active.width * (end - start))) * 100);
  }
  function pointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  const pointerHandlers = {
    onPointerDown: pointerDown,
    onPointerMove: pointerMove,
    onPointerUp: pointerEnd,
    onPointerCancel: pointerEnd,
    onLostPointerCapture: pointerEnd,
  };
  return (
    <div className="curtain-reveal" data-interactive={interactive} data-dragging={dragging}>
      <div className="curtain-reveal__scene" ref={root}>
        <div
          className="curtain-reveal__photo"
          style={
            {
              ...apertureStyle(curtainApertures.left),
              '--photo-position': leftPosition,
            } as CSSProperties
          }
        >
          {leftPhoto}
        </div>
        <div
          className="curtain-reveal__photo"
          style={
            {
              ...apertureStyle(curtainApertures.right),
              '--photo-position': rightPosition,
            } as CSSProperties
          }
        >
          {rightPhoto}
        </div>
        <Image
          className="curtain-reveal__frames"
          src="/img/hero-frames.png"
          alt=""
          aria-hidden="true"
          width={1536}
          height={1024}
          sizes="(max-width: 767px) 95vw, 48vw"
          loading="eager"
          draggable={false}
        />
        {interactive && (
          <>
            <div className="curtain-reveal__rod" aria-hidden="true" />
            <div
              ref={fabric}
              className="curtain-reveal__fabric"
              style={{ right: `${(1 - anchor) * 100}%`, width: `${(anchor - left) * 100}%` }}
              {...pointerHandlers}
              aria-hidden="true"
            >
              <Image
                src="/img/hero-curtain.png"
                alt=""
                width={1024}
                height={1536}
                sizes="(max-width: 767px) 45vw, 24vw"
                loading="eager"
                draggable={false}
              />
            </div>
            <div ref={handle} className="curtain-reveal__pull" style={{ left: `${left * 100}%` }}>
              <div
                className="curtain-reveal__slider"
                role="slider"
                tabIndex={0}
                aria-label="Reveal second fitting-room photo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                aria-valuetext={`${Math.round(progress)}% revealed`}
                aria-orientation="horizontal"
                aria-describedby={!used ? instruction : undefined}
                {...pointerHandlers}
                onFocus={() => cancelIntro.current()}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 10 : 5;
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 100
                        : ['ArrowRight', 'ArrowUp'].includes(event.key)
                          ? progress + step
                          : ['ArrowLeft', 'ArrowDown'].includes(event.key)
                            ? progress - step
                            : undefined;
                  if (next !== undefined) {
                    event.preventDefault();
                    adjust(next);
                  }
                }}
              >
                <svg viewBox="0 0 32 24" width="28" height="24" aria-hidden="true">
                  <path
                    d="M3 12h26M3 12l7-7M3 12l7 7M29 12l-7-7M29 12l-7 7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {!used && (
                <span className="curtain-reveal__instruction" id={instruction}>
                  Pull to reveal
                </span>
              )}
            </div>
          </>
        )}
      </div>
      {interactive ? (
        <button
          className="text-link curtain-reveal__toggle"
          type="button"
          onClick={() => adjust(progress < 50 ? 100 : 0)}
        >
          {progress < 50 ? 'Reveal photo' : 'Close curtain'}
        </button>
      ) : (
        <p className="body-sm curtain-reveal__fallback">A fitting-room reveal is coming soon.</p>
      )}
      <noscript>
        <style>{`.curtain-reveal__fabric,.curtain-reveal__rod,.curtain-reveal__pull,.curtain-reveal__toggle{display:none!important}`}</style>
      </noscript>
    </div>
  );
}
