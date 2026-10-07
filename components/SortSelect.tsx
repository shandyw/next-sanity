'use client';
export function SortSelect({
  selected,
  priceSortable,
  onChange,
}: {
  selected: string;
  onChange: (value: string) => void;
  priceSortable: boolean;
}) {
  return (
    <select
      className="filter-control"
      id="archiveSort"
      name="sort"
      value={selected || 'newest'}
      onChange={(event) => {
        onChange(event.currentTarget.value);
        event.currentTarget.form?.requestSubmit();
      }}
    >
      <option value="newest">Newest first</option>
      <option value="title">Title A–Z</option>
      {priceSortable && (
        <>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </>
      )}
    </select>
  );
}
