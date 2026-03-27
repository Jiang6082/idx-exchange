import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPropertyDetail, fetchOpenHouses } from '../api/client';
import './PropertyDetailPage.css';

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

function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPropertyData();
  }, [id]);

  async function loadPropertyData() {
    try {
      setLoading(true);
      setError(null);

      const [propertyData, openHousesData] = await Promise.all([
        fetchPropertyDetail(id),
        fetchOpenHouses(id)
      ]);

      setProperty(propertyData);
      setOpenHouses(openHousesData.openhouses || []);
    } catch (err) {
      setError(err.message || 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="loading">Loading property details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error">{error}</div>
        <button onClick={() => navigate('/')} className="btn-back">
          Back to Listings
        </button>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const photoUrl = getFirstPhotoUrl(property);

  const address =
    property.L_Address || property.L_AddressStreet || 'Address unavailable';

  const city = property.L_City || 'Unknown City';
  const state = property.L_State || '';
  const zip = property.L_Zip || '';

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

  const remarks = property.L_Remarks;
  const propertyType = property.L_Class || property.L_Type_ || null;
  const yearBuilt = property.YearBuilt || null;
  const lotSize = property.LotSizeAcres || null;
  const status = property.StandardStatus || property.L_Status || null;
  const listedDate = property.ListingContractDate || null;

  return (
    <div className="property-detail-page">
      <button onClick={() => navigate('/')} className="btn-back">
        ← Back to Listings
      </button>

      <div className="property-header">
        <h1>${price}</h1>
        <p className="property-address">{address}</p>
        <p className="property-location">
          {city}
          {state ? `, ${state}` : ''} {zip}
        </p>
      </div>

      <div className="property-image-main">
        {photoUrl ? (
          <img src={photoUrl} alt={address} />
        ) : (
          <div className="no-image">No image available</div>
        )}
      </div>

      <div className="property-content">
        <div className="property-main">
            <div className="property-stats">
            <div className="stat">
              <div className="stat-value">{beds}</div>
              <div className="stat-label">Bedrooms</div>
            </div>
            <div className="stat">
              <div className="stat-value">{baths}</div>
              <div className="stat-label">Bathrooms</div>
            </div>
            {sqft && (
              <div className="stat">
                <div className="stat-value">{sqft}</div>
                <div className="stat-label">Sq Ft</div>
              </div>
            )}
            {yearBuilt && (
              <div className="stat">
                <div className="stat-value">{yearBuilt}</div>
                <div className="stat-label">Year Built</div>
              </div>
            )}
          </div>

          <div className="property-section">
            <h2>Property Details</h2>
            <div className="detail-grid">
              {propertyType && (
                <div className="detail-item">
                  <span className="detail-label">Property Type:</span>
                  <span className="detail-value">{propertyType}</span>
                </div>
              )}

              {lotSize && (
                <div className="detail-item">
                  <span className="detail-label">Lot Size:</span>
                  <span className="detail-value">{lotSize} acres</span>
                </div>
              )}
            </div>
          </div>

          {remarks && (
            <div className="property-section">
              <h2>Description</h2>
              <p className="property-description">{remarks}</p>
            </div>
          )}
        </div>

        <div className="property-sidebar">
          <div className="open-houses-section">
            <h3>Open Houses</h3>

            {openHouses.length > 0 ? (
              <div className="open-houses-list">
                {openHouses.map((oh, index) => (
                  <div key={index} className="open-house-item">
                    <div className="oh-date">
                      {new Date(oh.OpenHouseDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="oh-time">
                      {oh.OH_StartTime} - {oh.OH_EndTime}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-open-houses">No open houses scheduled</p>
            )}
          </div>

          <div className="listing-info-section">
            <h3>Listing Information</h3>
            <div className="listing-info">
              {property.L_ListingID && (
                <div className="info-item">
                  <span className="info-label">MLS #:</span>
                  <span className="info-value">{property.L_ListingID}</span>
                </div>
              )}

              {status && (
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className="info-value">{status}</span>
                </div>
              )}

              {listedDate && (
                <div className="info-item">
                  <span className="info-label">Listed:</span>
                  <span className="info-value">
                    {new Date(listedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetailPage;