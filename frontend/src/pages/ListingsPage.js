import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProperties } from '../api/client';
import PropertyFilters from '../components/PropertyFilters';
import Pagination from '../components/Pagination';
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

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('ASC');

  const itemsPerPage = 20;

  useEffect(() => {
    loadProperties();
  }, [filters, currentPage, sortBy, sortOrder]);

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

      setProperties(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  return (
    <div className="listings-page">
      <h1>Property Listings</h1>

      <PropertyFilters onSearch={handleSearch} />

      <div className="sort-controls">
        <label htmlFor="sortBy">Sort by:</label>
        <select
          id="sortBy"
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value);
            setCurrentPage(1);
          }}
        >
          <option value="">Default</option>
          <option value="L_SystemPrice">Price</option>
          <option value="ListingContractDate">Date Listed</option>
          <option value="LM_Int2_3">Size</option>
          <option value="L_Keyword2">Bedrooms</option>
        </select>

        {sortBy && (
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ASC">Low to High</option>
            <option value="DESC">High to Low</option>
          </select>
        )}
      </div>

      {!loading && !error && total > 0 && (
        <p className="results-summary">
          Showing {((currentPage - 1) * itemsPerPage) + 1}-
          {Math.min(currentPage * itemsPerPage, total)} of {total.toLocaleString()} properties
        </p>
      )}

      {loading && <div className="loading">Loading properties...</div>}

      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          {properties.length === 0 ? (
            <div className="no-results">
              No properties found matching your criteria. Try adjusting your filters.
            </div>
          ) : (
            <div className="property-grid">
              {properties.map((property) => (
                <PropertyCard key={property.L_ListingID} property={property} />
              ))}
            </div>
          )}

          {properties.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function PropertyCard({ property }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/property/${property.L_ListingID}`);
  };

  const photoUrl = getFirstPhotoUrl(property);

  const address =
    property.L_Address || property.L_AddressStreet || 'Address unavailable';

  const city = property.L_City || 'Unknown City';
  const state = property.L_State || '';

  const price =
    property.L_SystemPrice !== null && property.L_SystemPrice !== undefined
      ? Number(property.L_SystemPrice).toLocaleString()
      : 'N/A';

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

  return (
    <div className="property-card" onClick={handleClick}>
      <div className="property-image">
        {photoUrl ? (
          <img src={photoUrl} alt={address} />
        ) : (
          <div className="no-image">No image available</div>
        )}
      </div>

      <div className="property-info">
        <div className="price">${price}</div>
        <div className="address">{address}</div>
        <div className="city">
          {city}
          {state ? `, ${state}` : ''}
        </div>

        <div className="property-details">
          <span>{beds} beds</span>
          <span>•</span>
          <span>{baths} baths</span>
          {sqft && (
            <>
              <span>•</span>
              <span>{sqft} sqft</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ListingsPage;