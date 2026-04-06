import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProperties } from '../api/client';
import PropertyFilters from '../components/PropertyFilters';
import Pagination from '../components/Pagination';
import MapView from '../components/MapView';
import { useFavorites } from '../hooks/useFavorites';
import './ListingsPage.css';

function getFirstPhotoUrl(property) {
  const raw = property?.L_Photos;
  if (!raw || typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0];
    }
  } catch (error) {
    console.error('Failed to parse L_Photos:', error);
  }

  return null;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return `$${Number(value).toLocaleString()}`;
}

function formatCompactNumber(value) {
  if (!value) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function formatListedDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getLocationLabel(property) {
  const city = property.L_City || 'Unknown City';
  const state = property.L_State || '';
  const zip = property.L_Zip || '';

  return [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '');
}

function getActiveFilterChips(filters) {
  const labels = {
    city: 'City',
    zipcode: 'ZIP',
    minPrice: 'Min',
    maxPrice: 'Max',
    beds: 'Beds',
    baths: 'Baths'
  };

  return Object.entries(filters).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    value:
      key === 'minPrice' || key === 'maxPrice'
        ? formatCurrency(value)
        : value
  }));
}

function HeartIcon({ active }) {
  return (
    <svg
      className="favorite-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 21s-6.716-4.35-9.293-8.033C.588 9.945 1.26 5.73 4.64 4.03c2.149-1.083 4.95-.47 6.36 1.496 1.41-1.966 4.211-2.579 6.36-1.496 3.38 1.7 4.052 5.915 1.933 8.937C18.716 16.65 12 21 12 21Z"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');

  const [viewMode, setViewMode] = useState('list');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const itemsPerPage = 20;

  const {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  } = useFavorites();

  useEffect(() => {
    let cancelled = false;

    async function loadProperties() {
      try {
        setLoading(true);
        setError(null);

        const offset = (currentPage - 1) * itemsPerPage;
        const params = {
          ...filters,
          limit: itemsPerPage,
          offset,
          ...(sortBy && { sortBy, sortOrder })
        };

        const data = await fetchProperties(params);

        if (!cancelled) {
          setProperties(data.results || []);
          setTotal(data.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load properties. Please try again.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProperties();

    return () => {
      cancelled = true;
    };
  }, [filters, currentPage, sortBy, sortOrder]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveFilter = (filterKey) => {
    const nextFilters = { ...filters };
    delete nextFilters[filterKey];
    setFilters(nextFilters);
    setCurrentPage(1);
  };

  const displayedProperties = useMemo(
    () =>
      showFavoritesOnly
        ? properties.filter((property) => favorites.includes(property.L_ListingID))
        : properties,
    [favorites, properties, showFavoritesOnly]
  );

  const activeFilterChips = useMemo(() => getActiveFilterChips(filters), [filters]);
  const totalPages = Math.ceil(total / itemsPerPage);
  const effectiveTotalPages = showFavoritesOnly
    ? Math.max(1, Math.ceil(displayedProperties.length / itemsPerPage))
    : totalPages;
  const effectiveCurrentPage = showFavoritesOnly ? 1 : currentPage;
  const priceValues = properties
    .map((property) => Number(property.L_SystemPrice))
    .filter((value) => !Number.isNaN(value) && value > 0);
  const averagePrice =
    priceValues.length > 0
      ? Math.round(priceValues.reduce((sum, value) => sum + value, 0) / priceValues.length)
      : null;
  const mapCount = properties.filter((property) => {
    const lat = Number(property.LMD_MP_Latitude);
    const lng = Number(property.LMD_MP_Longitude);
    return !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
  }).length;

  return (
    <div className="listings-page">
      <section className="listings-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Curated Market Search</span>
          <h1>Property Listings</h1>
          <p className="hero-subtitle">
            Explore active homes with map-first browsing, favorites, and a cleaner
            search experience built for quick comparison.
          </p>
        </div>

        <div className="hero-stats" aria-label="Listing summary">
          <div className="hero-stat-card">
            <span className="hero-stat-value">
              {formatCompactNumber(showFavoritesOnly ? displayedProperties.length : total)}
            </span>
            <span className="hero-stat-label">
              {showFavoritesOnly ? 'Favorites on this page' : 'Listings tracked'}
            </span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-value">{favorites.length}</span>
            <span className="hero-stat-label">Saved homes</span>
          </div>
          <div className="hero-stat-card">
            <span className="hero-stat-value">
              {averagePrice ? formatCurrency(averagePrice) : 'N/A'}
            </span>
            <span className="hero-stat-label">Average price on page</span>
          </div>
        </div>
      </section>

      <PropertyFilters onSearch={handleSearch} />

      {activeFilterChips.length > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {activeFilterChips.map((filter) => (
            <button
              key={filter.key}
              type="button"
              className="filter-chip"
              onClick={() => handleRemoveFilter(filter.key)}
            >
              <span>{filter.label}</span>
              <strong>{filter.value}</strong>
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      <div className="listings-toolbar">
        <div className="sort-controls">
          <div className="toolbar-label-group">
            <span className="toolbar-kicker">Sort results</span>
            <label htmlFor="sortBy">Choose an order</label>
          </div>

          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Recommended</option>
            <option value="L_SystemPrice">Price</option>
            <option value="ListingContractDate">Date listed</option>
            <option value="LM_Int2_3">Square footage</option>
            <option value="L_Keyword2">Bedrooms</option>
          </select>

          {sortBy && (
            <select
              aria-label="Sort direction"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="ASC">Low to high</option>
              <option value="DESC">High to low</option>
            </select>
          )}
        </div>

        <div className="view-controls" aria-label="View controls">
          <button
            type="button"
            className={viewMode === 'list' ? 'view-btn active' : 'view-btn'}
            onClick={() => setViewMode('list')}
          >
            Grid
          </button>
          <button
            type="button"
            className={viewMode === 'map' ? 'view-btn active' : 'view-btn'}
            onClick={() => setViewMode('map')}
          >
            Map
          </button>
          <button
            type="button"
            className={showFavoritesOnly ? 'view-btn active' : 'view-btn'}
            onClick={() => setShowFavoritesOnly((prev) => !prev)}
          >
            {showFavoritesOnly ? 'Favorites only' : 'Show favorites'}
          </button>
        </div>
      </div>

      {!loading && !error && total > 0 && (
        <div className="results-summary-shell">
          <p className="results-summary">
            {viewMode === 'map'
              ? 'Map results update as you pan and zoom around the area.'
              : showFavoritesOnly
              ? `Showing ${displayedProperties.length} favorite homes on this page`
              : `Showing ${displayedProperties.length} homes from page ${effectiveCurrentPage} of ${Math.max(effectiveTotalPages, 1)}`}
          </p>
          <div className="results-meta">
            <span>
              {viewMode === 'map'
                ? 'Viewport-based map search is active'
                : showFavoritesOnly
                ? `${displayedProperties.length} favorites in current results`
                : `${total.toLocaleString()} total matches`}
            </span>
            <span>
              {viewMode === 'map'
                ? 'Zoom in to reveal more homes in dense areas'
                : showFavoritesOnly
                ? `${displayedProperties.filter((property) => {
                    const lat = Number(property.LMD_MP_Latitude);
                    const lng = Number(property.LMD_MP_Longitude);
                    return !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
                  }).length} favorites with map coordinates`
                : `${mapCount} with map coordinates`}
            </span>
          </div>
        </div>
      )}

      {loading && <div className="loading panel">Loading properties...</div>}

      {error && <div className="error panel">{error}</div>}

      {!loading && !error && (
        <>
          {displayedProperties.length === 0 ? (
            <div className="no-results panel">
              <h2>No properties match the current view</h2>
              <p>
                Try broadening the filters, switching off favorites-only mode, or
                exploring another area.
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="property-grid">
              {displayedProperties.map((property) => (
                <PropertyCard
                  key={property.L_ListingID}
                  property={property}
                  isFavorite={isFavorite(property.L_ListingID)}
                  addFavorite={addFavorite}
                  removeFavorite={removeFavorite}
                />
              ))}
            </div>
          ) : (
            <MapView
              initialProperties={properties}
              filters={{
                ...filters,
                ...(sortBy && { sortBy, sortOrder })
              }}
              favorites={favorites}
              showFavoritesOnly={showFavoritesOnly}
            />
          )}

          {viewMode === 'list' && displayedProperties.length > 0 && (
            <Pagination
              currentPage={effectiveCurrentPage}
              totalPages={effectiveTotalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function PropertyCard({ property, isFavorite, addFavorite, removeFavorite }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/property/${property.L_ListingID}`);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();

    if (isFavorite) {
      removeFavorite(property.L_ListingID);
    } else {
      addFavorite(property.L_ListingID);
    }
  };

  const photoUrl = getFirstPhotoUrl(property);
  const address =
    property.L_Address || property.L_AddressStreet || 'Address unavailable';
  const location = getLocationLabel(property);
  const price = formatCurrency(property.L_SystemPrice);
  const beds =
    property.L_Keyword2 !== null && property.L_Keyword2 !== undefined
      ? property.L_Keyword2
      : '—';
  const baths =
    property.LM_Dec_3 !== null && property.LM_Dec_3 !== undefined
      ? property.LM_Dec_3
      : '—';
  const sqft =
    property.LM_Int2_3 !== null && property.LM_Int2_3 !== undefined
      ? Number(property.LM_Int2_3).toLocaleString()
      : null;
  const status = property.StandardStatus || property.L_Status || 'Active listing';
  const listedDate = formatListedDate(property.ListingContractDate);

  return (
    <article
      className="property-card"
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
        onClick={handleFavoriteClick}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        <HeartIcon active={isFavorite} />
      </button>

      <div className="property-image">
        {photoUrl ? (
          <img src={photoUrl} alt={address} />
        ) : (
          <div className="no-image">No image available</div>
        )}

        <div className="property-image-overlay">
          <span className="status-pill">{status}</span>
          {listedDate && <span className="listed-pill">Listed {listedDate}</span>}
        </div>
      </div>

      <div className="property-info">
        <div className="property-card-header">
          <div className="price">{price}</div>
          <span className="property-card-id">MLS #{property.L_ListingID}</span>
        </div>

        <div className="address">{address}</div>
        <div className="city">{location}</div>

        <div className="property-details">
          <span>{beds} beds</span>
          <span>{baths} baths</span>
          {sqft && <span>{sqft} sqft</span>}
        </div>

        <div className="property-card-footer">
          <span>Explore details</span>
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}

export default ListingsPage;
