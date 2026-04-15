import React, { useEffect, useState } from 'react';
import './PropertyFilters.css';

const EMPTY_FILTERS = {
  q: '',
  city: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: ''
};

function PropertyFilters({
  onSearch,
  recentSearches = [],
  onApplyRecentSearch,
  initialFilters = {}
}) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    setFilters((prev) => ({
      ...EMPTY_FILTERS,
      ...prev
    }));
  }, []);

  useEffect(() => {
    setFilters({
      ...EMPTY_FILTERS,
      ...(initialFilters || {})
    });
  }, [initialFilters]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const cleanFilters = {};
    Object.keys(filters).forEach((key) => {
      if (filters[key] && String(filters[key]).trim() !== '') {
        cleanFilters[key] = String(filters[key]).trim();
      }
    });

    onSearch(cleanFilters);
  };

  const handleClear = () => {
    setFilters(EMPTY_FILTERS);
    onSearch({});
  };

  return (
    <form className="property-filters" onSubmit={handleSubmit}>
      <div className="filters-heading">
        <div>
          <span className="filters-eyebrow">Search inventory</span>
          <h2>Refine your criteria</h2>
        </div>
        <p>Filter by location, price, and home size to narrow the results quickly.</p>
      </div>

      <div className="search-bar-shell">
        <div className="filter-group search-wide">
          <label htmlFor="q">Search by city, address, ZIP, or MLS</label>
          <input
            id="q"
            type="text"
            name="q"
            value={filters.q}
            onChange={handleChange}
            placeholder="Pasadena, 90210, Main St, or MLS #"
          />
        </div>
      </div>

      {recentSearches.length > 0 && (
        <div className="recent-searches">
          <span className="recent-searches-label">Recent searches</span>
          {recentSearches.map((search, index) => (
            <button
              key={`${search.label}-${index}`}
              type="button"
              className="recent-search-chip"
              onClick={() => {
                setFilters({
                  ...EMPTY_FILTERS,
                  ...(search.filters || {})
                });
                onApplyRecentSearch(search.filters || {});
              }}
            >
              {search.label}
            </button>
          ))}
        </div>
      )}

      <div className="filter-row">
        <div className="filter-group">
          <label htmlFor="city">City</label>
          <input
            id="city"
            type="text"
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="Pasadena"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="zipcode">ZIP Code</label>
          <input
            id="zipcode"
            type="text"
            name="zipcode"
            value={filters.zipcode}
            onChange={handleChange}
            placeholder="78704"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="minPrice">Min Price</label>
          <input
            id="minPrice"
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleChange}
            placeholder="250000"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="maxPrice">Max Price</label>
          <input
            id="maxPrice"
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            placeholder="950000"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="beds">Beds</label>
          <select id="beds" name="beds" value={filters.beds} onChange={handleChange}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="baths">Baths</label>
          <select id="baths" name="baths" value={filters.baths} onChange={handleChange}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
        </div>
      </div>

      <div className="filter-actions">
        <button type="submit" className="btn-primary">
          Search listings
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="btn-secondary"
        >
          Clear Filters
        </button>
      </div>
    </form>
  );
}

export default PropertyFilters;
