import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteSavedSearch,
  fetchCompareProperties,
  fetchProperties,
  saveSearch,
  updateSavedSearch
} from '../api/client';
import PropertyFilters from '../components/PropertyFilters';
import Pagination from '../components/Pagination';
import MapView from '../components/MapView';
import { GridSkeleton } from '../components/LoadingSkeleton';
import { useToast } from '../components/ToastContext';
import { useAccount } from '../hooks/useAccount';
import { useFavorites } from '../hooks/useFavorites';
import './ListingsPage.css';

function getPhotoUrls(property) {
  const raw = property?.L_Photos;
  if (!raw || typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to parse L_Photos:', error);
    return [];
  }
}

function getFirstPhotoUrl(property) {
  return getPhotoUrls(property)[0] || null;
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
    q: 'Search',
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

function calculateMortgage(price) {
  const amount = Number(price);
  if (Number.isNaN(amount) || amount <= 0) {
    return null;
  }

  const loanAmount = amount * 0.8;
  const monthlyRate = 0.065 / 12;
  const payments = 30 * 12;
  const payment =
    (loanAmount * monthlyRate * (1 + monthlyRate) ** payments) /
    ((1 + monthlyRate) ** payments - 1);

  return Math.round(payment);
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

const RECENT_SEARCHES_KEY = 'idxRecentSearches';

function ListingsPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');
  const [viewMode, setViewMode] = useState('list');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [compareProperties, setCompareProperties] = useState([]);
  const [showCompareDifferencesOnly, setShowCompareDifferencesOnly] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [saveSearchMessage, setSaveSearchMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const itemsPerPage = 20;

  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();
  const { profile, setProfile, accountState, setAccountState } = useAccount();
  const [draftProfile, setDraftProfile] = useState(profile);

  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

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
          includeAnalytics: true,
          ...(sortBy && { sortBy, sortOrder })
        };

        const data = await fetchProperties(params);

        if (!cancelled) {
          setProperties(data.results || []);
          setTotal(data.total || 0);
          setAnalytics(data.analytics || null);
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

  useEffect(() => {
    let cancelled = false;

    async function loadCompareProperties() {
      if (compareIds.length < 2) {
        setCompareProperties([]);
        return;
      }

      try {
        const data = await fetchCompareProperties(compareIds);
        if (!cancelled) {
          setCompareProperties(data.results || []);
        }
      } catch (compareError) {
        if (!cancelled) {
          pushToast('Unable to load comparison homes right now.', 'error');
        }
      }
    }

    loadCompareProperties();

    return () => {
      cancelled = true;
    };
  }, [compareIds, pushToast]);

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
  const mapCount = properties.filter((property) => {
    const lat = Number(property.LMD_MP_Latitude);
    const lng = Number(property.LMD_MP_Longitude);
    return !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
  }).length;
  const compareSelectionCount = compareIds.length;

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);

    const label =
      newFilters.q ||
      newFilters.city ||
      newFilters.zipcode ||
      `${Object.keys(newFilters).length || 0} filters`;
    const nextRecent = [
      { label, filters: newFilters },
      ...recentSearches.filter(
        (entry) => JSON.stringify(entry.filters) !== JSON.stringify(newFilters)
      )
    ].slice(0, 6);
    setRecentSearches(nextRecent);
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextRecent));
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

  const handleToggleCompare = (propertyId) => {
    setCompareIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }

      if (prev.length >= 4) {
        pushToast('You can compare up to four homes at a time.', 'info');
        return prev;
      }

      return [...prev, propertyId];
    });
  };

  const handleSaveSearch = async () => {
    try {
      const nextName =
        saveSearchName.trim() ||
        `${filters.city || filters.q || 'Market'} homes ${
          Object.keys(filters).length > 0 ? 'search' : 'watchlist'
        }`;
      const result = await saveSearch({
        name: nextName,
        filters: {
          ...filters,
          ...(sortBy && { sortBy, sortOrder })
        },
        alertEnabled: true
      });

      setAccountState((prev) => ({
        ...prev,
        savedSearches: [
          {
            ...result,
            lastSeenCount: total
          },
          ...(prev.savedSearches || [])
        ]
      }));
      setSaveSearchName('');
      setSaveSearchMessage('Search saved to your account.');
      pushToast('Saved search added to your account.', 'success');
      window.setTimeout(() => setSaveSearchMessage(''), 2200);
    } catch (saveError) {
      setSaveSearchMessage('Unable to save this search right now.');
      pushToast('Unable to save this search right now.', 'error');
    }
  };

  const handleToggleSavedSearchAlert = async (search) => {
    const nextValue = !search.alertEnabled;
    await updateSavedSearch(search.id, { alertEnabled: nextValue });
    setAccountState((prev) => ({
      ...prev,
      savedSearches: prev.savedSearches.map((item) =>
        item.id === search.id ? { ...item, alertEnabled: nextValue } : item
      )
    }));
    pushToast(nextValue ? 'Search alerts enabled.' : 'Search alerts paused.', 'success');
  };

  const handleApplySavedSearch = (search) => {
    const nextFilters = { ...(search.filters || {}) };
    const nextSortBy = nextFilters.sortBy || '';
    const nextSortOrder = nextFilters.sortOrder || 'ASC';
    delete nextFilters.sortBy;
    delete nextFilters.sortOrder;
    setFilters(nextFilters);
    setSortBy(nextSortBy);
    setSortOrder(nextSortOrder);
    setCurrentPage(1);
  };

  const handleDeleteSavedSearch = async (searchId) => {
    await deleteSavedSearch(searchId);
    setAccountState((prev) => ({
      ...prev,
      savedSearches: prev.savedSearches.filter((item) => item.id !== searchId)
    }));
    pushToast('Saved search removed.', 'success');
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    await setProfile(draftProfile);
    pushToast('Account profile updated.', 'success');
  };

  const shouldShowCompareField = (fieldAccessor) => {
    if (!showCompareDifferencesOnly) {
      return true;
    }

    return new Set(compareProperties.map(fieldAccessor)).size > 1;
  };

  return (
    <div className="listings-page">
      <section className="listings-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">Curated Market Search</span>
          <h1>Property Listings</h1>
          <p className="hero-subtitle">
            Explore active homes with saved searches, side-by-side comparison, account-backed
            favorites, and map-first browsing built for smarter decisions.
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
              {analytics?.averagePrice ? formatCurrency(analytics.averagePrice) : 'N/A'}
            </span>
            <span className="hero-stat-label">Average market price</span>
          </div>
        </div>
      </section>

      <section className="account-shell">
        <div className="account-card panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Account</span>
              <h2>Your synced profile</h2>
            </div>
            <p>Favorites, saved searches, and recently viewed homes stay tied to this account.</p>
          </div>

          <form className="account-form" onSubmit={handleSaveProfile}>
            <input
              type="text"
              value={draftProfile.name}
              onChange={(event) =>
                setDraftProfile((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="Full name"
            />
            <input
              type="email"
              value={draftProfile.email}
              onChange={(event) =>
                setDraftProfile((prev) => ({ ...prev, email: event.target.value }))
              }
              placeholder="Email address"
            />
            <button type="submit" className="btn-primary">
              Save account
            </button>
          </form>
        </div>

        <div className="saved-searches-card panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Saved searches</span>
              <h2>Alerts and watchlists</h2>
            </div>
            <p>Save your current criteria and keep a lightweight alert list in your account.</p>
          </div>

          <div className="saved-search-create">
            <input
              type="text"
              value={saveSearchName}
              onChange={(event) => setSaveSearchName(event.target.value)}
              placeholder="Name this search"
            />
            <button type="button" className="btn-primary" onClick={handleSaveSearch}>
              Save current search
            </button>
          </div>

          {saveSearchMessage && <p className="save-search-message">{saveSearchMessage}</p>}

          <div className="saved-search-list">
            {(accountState.savedSearches || []).length === 0 ? (
              <p className="empty-copy">No saved searches yet.</p>
            ) : (
              accountState.savedSearches.map((search) => (
                <div key={search.id} className="saved-search-item">
                  <div>
                    <strong>{search.name}</strong>
                    <span>{Object.keys(search.filters || {}).length} filters saved</span>
                  </div>
                  <div className="saved-search-actions">
                    <button type="button" onClick={() => handleApplySavedSearch(search)}>
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleSavedSearchAlert(search)}
                    >
                      {search.alertEnabled ? 'Alerts on' : 'Alerts off'}
                    </button>
                    <button type="button" onClick={() => handleDeleteSavedSearch(search.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {analytics && (
        <section className="analytics-grid">
          <div className="analytics-card panel">
            <span className="section-kicker">Market insight</span>
            <h3>Average price</h3>
            <strong>{formatCurrency(analytics.averagePrice)}</strong>
          </div>
          <div className="analytics-card panel">
            <span className="section-kicker">Market insight</span>
            <h3>Median price</h3>
            <strong>{formatCurrency(analytics.medianPrice)}</strong>
          </div>
          <div className="analytics-card panel">
            <span className="section-kicker">Market insight</span>
            <h3>Average price / sqft</h3>
            <strong>
              {analytics.averagePricePerSqft
                ? `$${analytics.averagePricePerSqft}/sqft`
                : 'N/A'}
            </strong>
          </div>
          <div className="analytics-card panel">
            <span className="section-kicker">Market insight</span>
            <h3>Newest listing in this view</h3>
            <strong>
              {analytics.newestListingDate
                ? formatListedDate(analytics.newestListingDate)
                : 'N/A'}
            </strong>
          </div>
        </section>
      )}

      <PropertyFilters
        onSearch={handleSearch}
        recentSearches={recentSearches}
        onApplyRecentSearch={handleSearch}
      />

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
            <option value="DaysOnMarket">Days on market</option>
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

      {compareSelectionCount > 0 && (
        <section className="compare-shell panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Compare homes</span>
              <h2>{compareSelectionCount} selected</h2>
            </div>
            <p>Select up to four homes to compare pricing, size, and timing side by side.</p>
          </div>

          <label className="compare-diff-toggle">
            <input
              type="checkbox"
              checked={showCompareDifferencesOnly}
              onChange={(event) => setShowCompareDifferencesOnly(event.target.checked)}
            />
            Show only rows that differ
          </label>

          {compareProperties.length >= 2 ? (
            <div className="compare-grid">
              {compareProperties.map((property) => (
                <div key={property.L_ListingID} className="compare-card">
                  {getFirstPhotoUrl(property) ? (
                    <img
                      src={getFirstPhotoUrl(property)}
                      alt={property.L_Address || 'Property'}
                      className="compare-image"
                    />
                  ) : (
                    <div className="compare-image compare-image-empty">No image</div>
                  )}
                  <strong>{property.L_Address || property.L_AddressStreet}</strong>
                  <span>{formatCurrency(property.L_SystemPrice)}</span>
                  {shouldShowCompareField((item) => item.L_Keyword2 || '—') && (
                    <span>{property.L_Keyword2 || '—'} beds</span>
                  )}
                  {shouldShowCompareField((item) => item.LM_Dec_3 || '—') && (
                    <span>{property.LM_Dec_3 || '—'} baths</span>
                  )}
                  {shouldShowCompareField((item) => item.LM_Int2_3 || '—') && (
                    <span>
                      {property.LM_Int2_3
                        ? `${Number(property.LM_Int2_3).toLocaleString()} sqft`
                        : 'Sqft unavailable'}
                    </span>
                  )}
                  {shouldShowCompareField((item) => item.LotSizeAcres || '—') && (
                    <span>
                      {property.LotSizeAcres
                        ? `${property.LotSizeAcres} acres`
                        : 'Lot size unavailable'}
                    </span>
                  )}
                  {shouldShowCompareField(
                    (item) => calculateMortgage(item.L_SystemPrice) || '—'
                  ) && (
                    <span>
                      {calculateMortgage(property.L_SystemPrice)
                        ? `Est. $${calculateMortgage(property.L_SystemPrice).toLocaleString()}/mo`
                        : 'Mortgage estimate unavailable'}
                    </span>
                  )}
                  <button
                    type="button"
                    className="compare-link"
                    onClick={() => navigate(`/property/${property.L_ListingID}`)}
                  >
                    Open details
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-copy">Select at least two homes to load the comparison view.</p>
          )}
        </section>
      )}

      {loading && viewMode === 'list' && <GridSkeleton count={6} />}
      {loading && viewMode === 'map' && <div className="loading panel">Loading properties...</div>}
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
                  isCompared={compareIds.includes(property.L_ListingID)}
                  onToggleCompare={handleToggleCompare}
                  compareDisabled={
                    compareIds.length >= 4 && !compareIds.includes(property.L_ListingID)
                  }
                  onOpen={() => navigate(`/property/${property.L_ListingID}`)}
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

function PropertyCard({
  property,
  isFavorite,
  addFavorite,
  removeFavorite,
  isCompared,
  onToggleCompare,
  compareDisabled,
  onOpen
}) {
  const handleFavoriteClick = async (e) => {
    e.stopPropagation();

    if (isFavorite) {
      await removeFavorite(property.L_ListingID);
    } else {
      await addFavorite(property.L_ListingID);
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
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
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

      <button
        type="button"
        className={`compare-btn ${isCompared ? 'active' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCompare(property.L_ListingID);
        }}
        disabled={compareDisabled}
      >
        {isCompared ? 'Selected' : 'Compare'}
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
