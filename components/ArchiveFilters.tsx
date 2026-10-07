'use client';

import { stegaClean } from 'next-sanity';

import { useEffect, useRef, useState } from 'react';
import Form from 'next/form';
import Link from 'next/link';
import { SortSelect } from './SortSelect';

type Option = { value: string; label: string };
export type ArchiveFilter = { name: string; label: string; options: Option[]; selected: string[] };
function Dropdown({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const dropdown = ref.current;
      if (!dropdown?.open || event.composedPath().includes(dropdown)) return;
      const focusInside = dropdown.contains(document.activeElement);
      dropdown.open = false;
      if (focusInside) dropdown.querySelector('summary')?.focus();
    };
    document.addEventListener('pointerdown', dismissOutside, true);
    return () => document.removeEventListener('pointerdown', dismissOutside, true);
  }, []);
  return (
    <details
      ref={ref}
      className={`archive-dropdown${active ? ' is-active' : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && ref.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          ref.current.open = false;
          ref.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary>
        {label}
        {active && <span className="visually-hidden">, filter selected</span>}
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m3 7 7 7 7-7" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </summary>
      <div className="archive-dropdown__panel">{children}</div>
    </details>
  );
}

export function ArchiveFilters({
  base,
  shop,
  query,
  filters,
  sort,
  price,
  stateKey,
  curated = false,
}: {
  base: string;
  stateKey: string;
  curated?: boolean;
  shop: boolean;
  query: string;
  filters: ArchiveFilter[];
  sort: string;
  price?: { currency: string; ceiling: number; min: string; max: string };
}) {
  const [previousStateKey, setPreviousStateKey] = useState(stateKey);
  const [selectedSort, setSelectedSort] = useState(sort || 'newest');
  const [search, setSearch] = useState(query);
  const [min, setMin] = useState(price?.min || '');
  const [max, setMax] = useState(price?.max || '');
  const [selected, setSelected] = useState<Record<string, string[]>>(
    Object.fromEntries(
      filters.map((filter) => [
        filter.name,
        filter.options
          .filter((option) => filter.selected.includes(option.value))
          .map((option) => option.value),
      ]),
    ),
  );
  // Sync controls on URL changes without remounting the form or losing focus/open panels.
  if (previousStateKey !== stateKey) {
    setPreviousStateKey(stateKey);
    setSearch(query);
    setMin(price?.min || '');
    setMax(price?.max || '');
    setSelectedSort(sort || 'newest');
    setSelected(
      Object.fromEntries(
        filters.map((filter) => [
          filter.name,
          filter.options
            .filter((option) => filter.selected.includes(option.value))
            .map((option) => option.value),
        ]),
      ),
    );
  }
  const hasFilters =
    Object.values(selected).some((values) => values.length > 0) || Boolean(min || max);
  const hasState = Boolean(search.trim()) || hasFilters || selectedSort !== 'newest';
  return (
    <Form action={base} scroll={false} className="archive-filter-form">
      <div className="archive-search-row">
        <div className="reviews-search" role="search">
          <label className="visually-hidden" htmlFor="archiveSearch">
            {shop ? 'Search items' : 'Search published articles'}
          </label>
          <input
            id="archiveSearch"
            type="search"
            name="q"
            placeholder={
              shop
                ? curated
                  ? 'Search curated finds'
                  : 'Search my closet'
                : 'Search fashion reviews'
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button className="btn btn-accent" type="submit">
            Search
          </button>
        </div>
        {hasState && (
          <Link
            className="btn btn-ghost archive-clear"
            href={base}
            scroll={false}
            onNavigate={() => {
              setSearch('');
              setMin('');
              setMax('');
              setSelectedSort('newest');
              setSelected(Object.fromEntries(filters.map((filter) => [filter.name, []])));
            }}
          >
            Clear search/filters
          </Link>
        )}
      </div>
      <div className="archive-dropdown-row" aria-label={shop ? 'Item filters' : 'Article filters'}>
        {filters.map((filter) => (
          <Dropdown
            key={filter.name}
            label={filter.label}
            active={Boolean(selected[filter.name]?.length)}
          >
            <fieldset>
              <legend className="visually-hidden">{filter.label}</legend>
              {filter.options.length ? (
                filter.options.map((option) => (
                  <label className="archive-dropdown__option" key={option.value}>
                    <input
                      type="checkbox"
                      name={filter.name}
                      value={option.value}
                      checked={selected[filter.name]?.includes(option.value) || false}
                      onChange={(event) => {
                        const form = event.currentTarget.form;
                        if (form) {
                          const data = new FormData(form);
                          setSelected(
                            Object.fromEntries(
                              filters.map((entry) => [
                                entry.name,
                                data.getAll(entry.name).map(String),
                              ]),
                            ),
                          );
                          form.requestSubmit();
                        }
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))
              ) : (
                <p>No options yet.</p>
              )}
            </fieldset>
          </Dropdown>
        ))}
        {price && (
          <Dropdown label="Price" active={Boolean(min || max)}>
            <fieldset className="archive-price">
              <legend className="visually-hidden">
                {shop ? 'Listing price' : 'Price when reviewed'} ({price.currency})
              </legend>
              <div className="archive-price__inputs">
                <label>
                  <span className="visually-hidden">Minimum price ({price.currency})</span>
                  <input
                    type="number"
                    name="min_price"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={min}
                    onChange={(event) => setMin(event.target.value)}
                  />
                </label>
                <label>
                  <span className="visually-hidden">Maximum price ({price.currency})</span>
                  <input
                    type="number"
                    name="max_price"
                    min={min || '0'}
                    step="0.01"
                    placeholder={String(price.ceiling)}
                    value={max}
                    onChange={(event) => setMax(event.target.value)}
                  />
                </label>
              </div>
              <label className="archive-price__range">
                <span className="visually-hidden">Minimum price slider ({price.currency})</span>
                <input
                  type="range"
                  min="0"
                  max={price.ceiling}
                  step="0.5"
                  value={min || 0}
                  onChange={(event) => {
                    setMin(event.target.value);
                    if (max && Number(max) < Number(event.target.value)) setMax(event.target.value);
                  }}
                />
              </label>
              <label className="archive-price__range">
                <span className="visually-hidden">Maximum price slider ({price.currency})</span>
                <input
                  type="range"
                  min="0"
                  max={price.ceiling}
                  step="0.5"
                  value={max || price.ceiling}
                  onChange={(event) => {
                    setMax(event.target.value);
                    if (min && Number(min) > Number(event.target.value)) setMin(event.target.value);
                  }}
                />
              </label>
              <p>
                Price:{' '}
                {new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency: stegaClean(price.currency),
                  maximumFractionDigits: 2,
                }).format(Number(min || 0))}{' '}
                –{' '}
                {new Intl.NumberFormat('en', {
                  style: 'currency',
                  currency: stegaClean(price.currency),
                  maximumFractionDigits: 2,
                }).format(Number(max || price.ceiling))}
              </p>
              <button type="submit" className="btn btn-accent">
                Apply price
              </button>
            </fieldset>
          </Dropdown>
        )}
        <div className="reviews-sort">
          <label htmlFor="archiveSort">Sort</label>
          <SortSelect
            selected={selectedSort}
            onChange={setSelectedSort}
            priceSortable={Boolean(price)}
          />
        </div>
      </div>
    </Form>
  );
}
