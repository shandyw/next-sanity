'use client';
import { useState, useEffect, useRef } from 'react';
import { SavedFindsLink } from './SavedFindsLink';
export function Header({ mobileSocials }: { mobileSocials?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !e.defaultPrevented) {
        setOpen(false);
        document.getElementById('menuToggle')?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', outside);
    };
  }, [open]);
  return (
    <div ref={ref}>
      <header className="site-header" id="site-header">
        <div className="header-inner">
          <a className="wordmark" href="/" aria-label="CurvyGirlReviews home">
            <img className="wordmark__icon" src="/img/curvy.png" alt="" />
            CurvyGirlReviews
          </a>

          <button
            className="menu-toggle"
            id="menuToggle"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="primaryNav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <span className="menu-toggle__bar"></span>
            <span className="menu-toggle__bar"></span>
            <span className="menu-toggle__bar"></span>
          </button>

          <nav
            className={open ? 'primary-nav is-open' : 'primary-nav'}
            id="primaryNav"
            aria-label="Primary"
          >
            <ul className="primary-nav__list">
              <li>
                <a href="/reviews">Reviews</a>
              </li>
              <li>
                <a href="/shop">Shop</a>
              </li>
              <li>
                <a href="/about/">About</a>
              </li>

              <li>
                <a href="/support/">Support the Reviews</a>
              </li>
            </ul>

            <div className="nav-actions">
              <SavedFindsLink />
            </div>
            {mobileSocials}
          </nav>
        </div>
      </header>
    </div>
  );
}
