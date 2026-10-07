'use client';
import { useState, useEffect, useRef } from 'react';
import type { Settings } from '@/lib/types';
import { SocialLinks } from './SocialLinks';
export function Header({ settings }: { settings: Settings }) {
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
                <a href="/my-faves/">My Faves</a>
              </li>
              <li>
                <a href="/wishlist">Wishlist</a>
              </li>
              <li>
                <a
                  href="#contactDialog"
                  data-open-contact
                  aria-haspopup="dialog"
                  aria-controls="contactDialog"
                >
                  Contact
                </a>
              </li>
            </ul>

            <div className="nav-actions">
              <SocialLinks settings={settings} header />
              <button className="btn btn-accent" data-open-dialog>
                Request a Review
              </button>
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
