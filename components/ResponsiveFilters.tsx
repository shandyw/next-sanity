'use client';
import { useRef, useSyncExternalStore } from 'react';
const subscribe = (callback: () => void) => {
  const media = window.matchMedia('(max-width:899px)');
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};
export function ResponsiveFilters({ children }: { children: React.ReactNode }) {
  const mobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(max-width:899px)').matches,
    () => false,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  if (!mobile)
    return (
      <section className="filter-panel-desktop" aria-label="Review filters">
        {children}
      </section>
    );
  return (
    <>
      <button
        className="filter-icon-btn reviews-mobile-filter mobile-filter-trigger"
        ref={trigger}
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        Filters
      </button>
      <dialog
        ref={dialog}
        className="dialog native-dialog"
        aria-labelledby="filterTitle"
        onClose={() => {
          dialog.current
            ?.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select')
            .forEach((n) => {
              if (n instanceof HTMLInputElement) {
                n.value = n.defaultValue;
                n.checked = n.defaultChecked;
              } else Array.from(n.options).forEach((o) => (o.selected = o.defaultSelected));
            });
          trigger.current?.focus();
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const nodes = Array.from(
            e.currentTarget.querySelectorAll<HTMLElement>('button,input,select'),
          ).filter((n) => n.getClientRects().length > 0);
          if (e.shiftKey && document.activeElement === nodes[0]) {
            e.preventDefault();
            nodes.at(-1)?.focus();
          } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
            e.preventDefault();
            nodes[0]?.focus();
          }
        }}
      >
        <h2 className="headline-md" id="filterTitle">
          Filters
        </h2>
        <button
          className="dialog-close"
          aria-label="Close filters"
          type="button"
          onClick={() => dialog.current?.close()}
        >
          ×
        </button>
        {children}
      </dialog>
    </>
  );
}
