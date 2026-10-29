'use client';

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
    const dismissOutside = (event: MouseEvent) => {
      const dropdown = ref.current;
      if (!dropdown?.open || event.composedPath().includes(dropdown)) return;
      if ((event.target as Element | null)?.closest?.('.archive-dropdown')) return;
      const focusInside = dropdown.contains(document.activeElement);
      dropdown.open = false;
      if (focusInside) dropdown.querySelector('summary')?.focus();
    };
    document.addEventListener('click', dismissOutside, true);
    return () => document.removeEventListener('click', dismissOutside, true);
  }, []);
  return (
    <details
      ref={ref}
      className={`archive-dropdown${active ? ' is-active' : ''}`}
      onToggle={(event) => {
        const dropdown = event.currentTarget;
        if (!dropdown.open) return;
        dropdown
          .closest('.archive-dropdown-row')
          ?.querySelectorAll<HTMLDetailsElement>('details.archive-dropdown[open]')
          .forEach((other) => {
            if (other !== dropdown) other.open = false;
          });
      }}
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
  catalog,
  query,
  filters,
  sort,
  priceSortable,
  stateKey,
  curated = false,
}: {
  base: string;
  stateKey: string;
  curated?: boolean;
  shop: boolean;
  catalog: boolean;
  query: string;
  filters: ArchiveFilter[];
  sort: string;
  priceSortable: boolean;
}) {
  const [previousStateKey, setPreviousStateKey] = useState(stateKey);
  const [selectedSort, setSelectedSort] = useState(sort || 'newest');
  const [search, setSearch] = useState(query);
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
  const hasFilters = Object.values(selected).some((values) => values.length > 0);
  const hasState = Boolean(search.trim()) || hasFilters || selectedSort !== 'newest';
  return (
    <Form
      action={base}
      scroll={false}
      className={`archive-filter-form${catalog ? ' archive-filter-form--catalog' : ''}`}
    >
      <label className="archive-search-label" htmlFor="archiveSearch">
        {shop ? 'Search items' : catalog ? 'Search reviews' : 'Search published articles'}
      </label>
      <div className="archive-filter-shell">
        <div className="archive-search-row">
          <div className="reviews-search" role="search">
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
            <button className="btn btn-accent joined" type="submit">
              Search
            </button>
          </div>
          {!catalog && hasState && (
            <Link
              className="btn btn-ghost archive-clear"
              href={base}
              scroll={false}
              onNavigate={() => {
                setSearch('');
                setSelectedSort('newest');
                setSelected(Object.fromEntries(filters.map((filter) => [filter.name, []])));
              }}
            >
              Clear search/filters
            </Link>
          )}
        </div>
        <div
          className="archive-dropdown-row"
          role="group"
          aria-label={shop ? 'Item filters' : 'Article filters'}
        >
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
          <div className="reviews-sort">
            <label htmlFor="archiveSort">{catalog ? 'Sort by' : 'Sort'}</label>
            <SortSelect
              selected={selectedSort}
              onChange={setSelectedSort}
              priceSortable={priceSortable}
            />
          </div>
        </div>
      </div>
    </Form>
  );
}
