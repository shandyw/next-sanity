'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { SavedFindsLink } from './SavedFindsLink';
export function Header({ mobileSocials }: { mobileSocials?: React.ReactNode }) {
  const pathname = usePathname();
  const activeSection =
    pathname === '/shop/closet' || pathname.startsWith('/shop/closet/')
      ? 'closet'
      : pathname === '/shop' || pathname.startsWith('/shop/') || pathname.startsWith('/looks/')
        ? 'shop'
        : pathname === '/reviews' || pathname.startsWith('/reviews/')
          ? 'reviews'
          : pathname === '/about' || pathname.startsWith('/about/')
            ? 'about'
            : null;
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
            <img className="wordmark__icon" src="/img/curvy.png" alt="CurvyGirlReviews Logo" />
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
                <a href="/reviews" aria-current={activeSection === 'reviews' ? 'page' : undefined}>
                  Reviews
                </a>
              </li>

              <li>
                <a href="/shop" aria-current={activeSection === 'shop' ? 'page' : undefined}>
                  Shop the Looks
                </a>
              </li>
              <li>
                <a
                  href="/shop/closet"
                  aria-current={activeSection === 'closet' ? 'page' : undefined}
                >
                  My Closet
                </a>
              </li>
              <li>
                <a href="/about/" aria-current={activeSection === 'about' ? 'page' : undefined}>
                  About
                </a>
              </li>
            </ul>

            <div className="nav-actions">
              <SavedFindsLink />

              <button
                type="button"
                data-open-dialog
                aria-haspopup="dialog"
                className="btn btn-accent"
              >
                Request a Review
              </button>
            </div>
            {mobileSocials}
          </nav>
        </div>
      </header>
    </div>
  );
}
