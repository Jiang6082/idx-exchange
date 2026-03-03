import React, { useEffect, useState } from 'react';
import { fetchProperties } from '../api/client';
import './ListingsPage.css';

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProperties();
  }, []);

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchProperties({ limit: 20, offset: 0 });
      setProperties(data.results || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading properties...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="listings-page">
      <h1>Property Listings</h1>
      <p>Showing {properties.length} of {total} properties</p>

      <div className="property-grid">
        {properties.map((property) => (
          <PropertyCard key={property.L_ListingID} property={property} />
        ))}
      </div>
    </div>
  );
}

function PropertyCard({ property }) {
  const price =
    typeof property.L_SystemPrice === 'number'
      ? property.L_SystemPrice.toLocaleString()
      : property.L_SystemPrice
      ? Number(property.L_SystemPrice).toLocaleString()
      : 'N/A';

  const address = property.L_Address || property.L_AddressStreet || 'Address unavailable';
  const city = property.L_City || 'City';
  const state = property.L_State || 'State';

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
          {city}, {state}
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