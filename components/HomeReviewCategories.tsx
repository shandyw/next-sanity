'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { ArrowIcon } from './ArrowIcon';
import { findCategoryIcon } from '@/lib/look-presentation';
import type { HomeReviewCategory } from '@/lib/home-review-categories';

type Category = HomeReviewCategory & { media: ReactNode };

export function HomeReviewCategories({ categories }: { categories: Category[] }) {
  const [selected, setSelected] = useState(0);
  const [scroll, setScroll] = useState({ overflow: false, previous: false, next: false });
  const trackRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = {
      overflow: track.scrollWidth > track.clientWidth + 1,
      previous: track.scrollLeft > 1,
      next: track.scrollLeft + track.clientWidth < track.scrollWidth - 1,
    };
    setScroll((current) =>
      current.overflow === next.overflow &&
      current.previous === next.previous &&
      current.next === next.next
        ? current
        : next,
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    measure();
    return () => observer.disconnect();
  }, [measure]);

  function select(index: number, focus = false) {
    setSelected(index);
    const track = trackRef.current;
    const tab = track?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[index];
    if (track && tab) {
      if (focus) tab.focus();
      const left = tab.offsetLeft - track.offsetLeft;
      if (
        left < track.scrollLeft ||
        left + tab.offsetWidth > track.scrollLeft + track.clientWidth
      ) {
        track.scrollTo({
          left,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      }
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index =
      event.key === 'ArrowRight'
        ? (selected + 1) % categories.length
        : event.key === 'ArrowLeft'
          ? (selected - 1 + categories.length) % categories.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? categories.length - 1
              : -1;
    if (index < 0) return;
    event.preventDefault();
    select(index, true);
  }

  function move(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.75,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }

  if (!categories.length) return null;
  const category = categories[selected] || categories[0];
  const href = `/reviews?category=${encodeURIComponent(category.slug || category._id)}`;

  return (
    <section className="home-categories" aria-labelledby="home-categories-heading">
      <div className="container">
        <p className="eyebrow home-categories__eyebrow">Discover Reviews</p>
        <h2 id="home-categories-heading">Browse Reviews by Category</h2>
        <p className="home-categories__intro">
          Find real reviews and fit notes for your favorite wardrobe staples.
        </p>

        <div className="home-categories__tabs-wrap">
          {scroll.overflow && (
            <button
              type="button"
              className="home-categories__scroll home-categories__scroll--previous"
              onClick={() => move(-1)}
              disabled={!scroll.previous}
              aria-label="Scroll categories left"
            >
              <ArrowIcon />
            </button>
          )}
          <div
            className="home-categories__tabs"
            role="tablist"
            aria-label="Review categories"
            ref={trackRef}
            onScroll={measure}
            onKeyDown={onTabKeyDown}
          >
            {categories.map((item, index) => (
              <button
                key={item.slug || item._id}
                type="button"
                role="tab"
                id={`home-category-tab-${index}`}
                aria-controls="home-category-panel"
                aria-selected={selected === index}
                tabIndex={selected === index ? 0 : -1}
                className="home-categories__tab"
                onClick={() => select(index)}
              >
                <img src={findCategoryIcon(item.slug)} alt="" width="40" height="40" />
                <span className="home-categories__tab-copy">
                  <strong>{item.title}</strong>
                  <span>
                    {item.count} {item.count === 1 ? 'Review' : 'Reviews'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          {scroll.overflow && (
            <button
              type="button"
              className="home-categories__scroll"
              onClick={() => move(1)}
              disabled={!scroll.next}
              aria-label="Scroll categories right"
            >
              <ArrowIcon />
            </button>
          )}
        </div>

        <div
          className="home-categories__panel"
          role="tabpanel"
          id="home-category-panel"
          aria-labelledby={`home-category-tab-${selected}`}
          tabIndex={0}
        >
          <div className="home-categories__media">{category.media}</div>
          <div className="home-categories__detail">
            <img
              className="home-categories__large-icon"
              src={findCategoryIcon(category.slug)}
              alt=""
              width="240"
              height="240"
            />
            <p className="eyebrow">Featured Category</p>
            <h3>{category.title}</h3>
            <p className="home-categories__blurb">
              {category.homepageBlurb?.trim() ||
                `Explore ${category.title.toLowerCase()} reviews and fit notes.`}
            </p>
            <div className="home-categories__actions">
              <Link className="btn btn-accent" href={href}>
                Browse {category.title} Reviews
              </Link>
              <Link className="btn btn-ghost" href="/reviews">
                View All Categories
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
