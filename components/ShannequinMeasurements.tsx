'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { stegaClean } from 'next-sanity';
import {
  measurementAreas,
  measurementDisplay,
  type MeasurementArea,
  type ShannequinMeasurements,
} from '@/lib/shannequin-measurements';

export function ShannequinMeasurements({
  children,
  measurements = {},
  hasImage,
}: {
  children: ReactNode;
  measurements?: ShannequinMeasurements;
  hasImage: boolean;
}) {
  const [active, setActive] = useState<MeasurementArea | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [stageHeight, setStageHeight] = useState(0);
  const pinned = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerFocus = useRef(false);
  const id = useId();
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  const close = () => {
    cancel();
    pinned.current = false;
    setActive(null);
  };
  const leave = () => {
    cancel();
    timer.current = setTimeout(() => {
      if (
        !pinned.current &&
        !root.current?.querySelector('.measurement-hotspot:focus, .measurement-popup:focus-within')
      )
        setActive(null);
    }, 180);
  };
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => setStageHeight(element.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (
        !root.current?.contains(target) ||
        !target.closest('.measurement-hotspot, .measurement-popup')
      ) {
        if (timer.current) clearTimeout(timer.current);
        pinned.current = false;
        setActive(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        pinned.current = false;
        setActive(null);
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  const selected = measurementAreas.find((area) => area.id === active);
  const entry = active ? measurements[active] : undefined;
  return (
    <div ref={root} className="measurements">
      <div ref={stage} className="measurements__stage">
        {children}
        {hasImage &&
          measurementAreas.map((area) => {
            const label = stegaClean(measurements[area.id]?.label)?.trim() || area.label;
            return (
              <button
                key={area.id}
                type="button"
                className={`measurement-hotspot measurement-hotspot--${area.side}`}
                style={{ '--point-x': `${area.x}%`, '--point-y': `${area.y}%` } as CSSProperties}
                aria-label={`Show ${label.toLowerCase()} measurement`}
                aria-expanded={active === area.id}
                aria-controls={`${id}-popup`}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') {
                    cancel();
                    if (!pinned.current) setActive(area.id);
                  }
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === 'mouse') leave();
                }}
                onPointerDown={() => {
                  pointerFocus.current = true;
                }}
                onFocus={() => {
                  cancel();
                  if (!pointerFocus.current) {
                    pinned.current = false;
                    setActive(area.id);
                  }
                  pointerFocus.current = false;
                }}
                onBlur={leave}
                onClick={() => {
                  pointerFocus.current = false;
                  cancel();
                  if (active === area.id && pinned.current) close();
                  else {
                    pinned.current = true;
                    setActive(area.id);
                  }
                }}
              >
                <span className="measurement-hotspot__circle" aria-hidden="true">
                  {active === area.id ? '−' : '+'}
                </span>
                <span className="measurement-hotspot__label" aria-hidden="true">
                  {label}
                </span>
              </button>
            );
          })}
      </div>
      <div
        id={`${id}-popup`}
        className={`measurement-popup${selected && selected.x < 50 ? ' measurement-popup--right' : ''}`}
        hidden={!selected}
        role="region"
        aria-labelledby={`${id}-label`}
        aria-live="polite"
        style={
          {
            '--popup-top': `${Math.max(0, Math.min(stageHeight - 180, (stageHeight * (selected?.y || 0)) / 100 - 50))}px`,
            '--anchor-x': `${6 + 0.88 * (selected?.x || 0)}%`,
          } as CSSProperties
        }
        onPointerEnter={cancel}
        onPointerLeave={leave}
      >
        <p id={`${id}-label`} className="measurement-popup__label">
          {entry?.label || selected?.label}
        </p>
        <p className="measurement-popup__value">{measurementDisplay(entry)}</p>
        {entry?.description && (
          <p className="measurement-popup__description">{entry.description}</p>
        )}
      </div>
      <noscript>
        <style>{'.measurement-hotspot { display: none; }'}</style>
      </noscript>
    </div>
  );
}

export function ShannequinMeasurementList({
  measurements = {},
}: {
  measurements?: ShannequinMeasurements;
}) {
  return (
    <details className="measurements__all">
      <summary>View all measurements</summary>
      <dl>
        {measurementAreas.map((area) => (
          <div key={area.id}>
            <dt>{measurements[area.id]?.label || area.label}</dt>
            <dd>
              {measurementDisplay(measurements[area.id])}
              {measurements[area.id]?.description && <p>{measurements[area.id]?.description}</p>}
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
