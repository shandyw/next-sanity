'use client';
export function HomeSearch() {
  return (
    <form
      className="search-form"
      role="search"
      action="/reviews"
      method="get"
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem('q') as HTMLInputElement;
        input.value = input.value.trim();
        if (!input.value) {
          e.preventDefault();
          input.setCustomValidity('Enter a search term.');
          input.reportValidity();
        }
      }}
    >
      <div className="search-field">
        <svg
          className="search-icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        <label htmlFor="homeSearchInput" className="visually-hidden">
          Search fashion reviews
        </label>
        <input
          type="search"
          id="homeSearchInput"
          name="q"
          placeholder="Search fashion reviews"
          required
          onInput={(e) => e.currentTarget.setCustomValidity('')}
        />
      </div>
      <button type="submit" className="btn btn-accent home-search-submit">
        Search
      </button>
    </form>
  );
}
