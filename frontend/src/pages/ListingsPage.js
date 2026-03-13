import React, { useState, useEffect } from 'react';
import { fetchProperties } from '../api/client';
import PropertyFilters from '../components/PropertyFilters';
import './ListingsPage.css';

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    loadProperties();
  }, [filters]);

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);

      const params = { ...filters, limit: 20, offset: 0 };
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
  };

  return (
    <div className="listings-page">
      <h1>Property Listings</h1>

      <PropertyFilters onSearch={handleSearch} />

      {loading && <div className="loading">Loading properties...</div>}

      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <>
          <p>Showing {properties.length} of {total} properties</p>

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
        </>
      )}
    </div>
  );
}

function PropertyCard({ property }) {
  const address =
    property.L_Address || property.L_AddressStreet || 'Address unavailable';

  const city = property.L_City || 'Unknown City';
  const state = property.L_State || '';

  const price =
    property.L_SystemPrice !== null && property.L_SystemPrice !== undefined
      ? Number(property.L_SystemPrice).toLocaleString()
      : 'N/A';

  const beds =
    property.LM_Int2_3 !== null && property.LM_Int2_3 !== undefined
      ? property.LM_Int2_3
      : '—';

  const baths =
    property.LM_Dec_3 !== null && property.LM_Dec_3 !== undefined
      ? property.LM_Dec_3
      : '—';

  return (
    <div className="property-card">
      <div className="property-image">
        <div className="no-image">No image available</div>
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
        </div>
      </div>
    </div>
  );
}

export default ListingsPage;