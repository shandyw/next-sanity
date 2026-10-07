'use client';
export function CategoryFilters({
  options,
  selected,
}: {
  options: { value: string; label: string }[];
  selected: string[];
}) {
  if (!options.length) return null;
  return (
    <fieldset className="reviews-category-buttons category-pill-group">
      <legend className="visually-hidden">Clothing categories</legend>
      {options.map((o) => (
        <label key={o.value} className="review-category-button">
          <input
            className="visually-hidden"
            type="checkbox"
            name="category"
            value={o.value}
            defaultChecked={selected.includes(o.value)}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
