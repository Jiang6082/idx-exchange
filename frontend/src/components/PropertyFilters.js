import React, { useState } from 'react';
import './PropertyFilters.css';

function PropertyFilters({ onSearch }) {
  const [filters, setFilters] = useState({
    city: '',
    zipcode: '',
    minPrice: '',
    maxPrice: '',
    beds: '',
    baths: ''
  });

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
      if (filters[key] && filters[key].trim() !== '') {
        cleanFilters[key] = filters[key].trim();
      }
    });

    onSearch(cleanFilters);
  };

  const handleClear = () => {
    const emptyFilters = {
      city: '',
      zipcode: '',
      minPrice: '',
      maxPrice: '',
      beds: '',
      baths: ''
    };

    setFilters(emptyFilters);
    onSearch({});
  };

  return (
    <form className="property-filters" onSubmit={handleSubmit}>
      <div className="filter-row">

        <div className="filter-group">
          <label>City</label>
          <input
            type="text"
            name="city"
            value={filters.city}
            onChange={handleChange}
            placeholder="Enter city"
          />
        </div>

        <div className="filter-group">
          <label>ZIP Code</label>
          <input
            type="text"
            name="zipcode"
            value={filters.zipcode}
            onChange={handleChange}
            placeholder="Enter ZIP"
          />
        </div>

        <div className="filter-group">
          <label>Min Price</label>
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleChange}
            placeholder="$0"
          />
        </div>

        <div className="filter-group">
          <label>Max Price</label>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleChange}
            placeholder="No max"
          />
        </div>

        <div className="filter-group">
          <label>Beds</label>
          <select name="beds" value={filters.beds} onChange={handleChange}>
            <option value="">Any</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
            <option value="5">5+</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Baths</label>
          <select name="baths" value={filters.baths} onChange={handleChange}>
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
          Search
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