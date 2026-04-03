import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchPropertyDetail, fetchOpenHouses } from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
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

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  return `$${Number(value).toLocaleString()}`;
}

function formatDate(value, options = {}) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options
  });
}

function getLocationLabel(property) {
  const city = property.L_City || 'Unknown City';
  const state = property.L_State || '';
  const zip = property.L_Zip || '';

  return [city, state].filter(Boolean).join(', ') + (zip ? ` ${zip}` : '');
}

function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareMessage, setShareMessage] = useState('');

  const {
    addFavorite,
    removeFavorite,
    isFavorite
  } = useFavorites();

  useEffect(() => {
    let cancelled = false;

    async function loadPropertyData() {
      try {
        setLoading(true);
        setError(null);

        const [propertyData, openHousesData] = await Promise.all([
          fetchPropertyDetail(id),
          fetchOpenHouses(id)
        ]);

        if (!cancelled) {
          setProperty(propertyData);
          setOpenHouses(openHousesData.openhouses || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load property details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPropertyData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="loading panel">Loading property details...</div>;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error panel">{error}</div>
        <button onClick={() => navigate('/')} className="btn-back">
          Back to Listings
        </button>
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const favorite = isFavorite(property.L_ListingID);
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
  const remarks = property.L_Remarks;
  const propertyType = property.L_Class || property.L_Type_ || null;
  const yearBuilt = property.YearBuilt || null;
  const lotSize = property.LotSizeAcres || null;
  const status = property.StandardStatus || property.L_Status || 'Active';
  const listedDate = formatDate(property.ListingContractDate);

  const handleFavoriteClick = () => {
    if (favorite) {
      removeFavorite(property.L_ListingID);
    } else {
      addFavorite(property.L_ListingID);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: address,
      text: `${address} listed for ${price}`,
      url: shareUrl
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage('Listing shared.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage('Link copied to clipboard.');
      } else {
        setShareMessage('Sharing is not supported in this browser.');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        setShareMessage('Unable to share this listing right now.');
      }
    }

    window.setTimeout(() => setShareMessage(''), 2400);
  };

  return (
    <div className="property-detail-page">
      <button onClick={() => navigate('/')} className="btn-back">
        ← Back to Listings
      </button>

      <section className="detail-hero">
        <div className="property-header">
          <div className="detail-meta-row">
            <span className="status-pill detail-status-pill">{status}</span>
            {listedDate && <span className="detail-listed-date">Listed {listedDate}</span>}
          </div>

          <h1>{price}</h1>
          <p className="property-address">{address}</p>
          <p className="property-location">{location}</p>

          <div className="detail-actions">
            <button
              type="button"
              className={`detail-favorite-btn ${favorite ? 'active' : ''}`}
              onClick={handleFavoriteClick}
            >
              {favorite ? 'Saved to favorites' : 'Save to favorites'}
            </button>
            <button type="button" className="detail-share-btn" onClick={handleShare}>
              Share listing
            </button>
          </div>

          {shareMessage && <p className="share-message">{shareMessage}</p>}
        </div>

        <div className="property-image-main">
          {photoUrl ? (
            <img src={photoUrl} alt={address} className="detail-main-image" />
          ) : (
            <div className="no-image">No image available</div>
          )}
        </div>
      </section>

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
                  <span className="detail-label">Property Type</span>
                  <span className="detail-value">{propertyType}</span>
                </div>
              )}

              {lotSize && (
                <div className="detail-item">
                  <span className="detail-label">Lot Size</span>
                  <span className="detail-value">{lotSize} acres</span>
                </div>
              )}

              {listedDate && (
                <div className="detail-item">
                  <span className="detail-label">Listed</span>
                  <span className="detail-value">{listedDate}</span>
                </div>
              )}

              {property.L_ListingID && (
                <div className="detail-item">
                  <span className="detail-label">MLS Number</span>
                  <span className="detail-value">{property.L_ListingID}</span>
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

        <aside className="property-sidebar">
          <div className="open-houses-section">
            <div className="sidebar-card-header">
              <h3>Open Houses</h3>
              <span className="sidebar-badge">{openHouses.length}</span>
            </div>

            {openHouses.length > 0 ? (
              <div className="open-houses-list">
                {openHouses.map((oh, index) => (
                  <div key={index} className="open-house-item">
                    <div className="oh-date">
                      {formatDate(oh.OpenHouseDate, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="oh-time">
                      {oh.OH_StartTime} - {oh.OH_EndTime}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-open-houses">
                No open houses are scheduled right now for this property.
              </p>
            )}
          </div>

          <div className="listing-info-section">
            <div className="sidebar-card-header">
              <h3>Listing Information</h3>
            </div>
            <div className="listing-info">
              {property.L_ListingID && (
                <div className="info-item">
                  <span className="info-label">MLS #</span>
                  <span className="info-value">{property.L_ListingID}</span>
                </div>
              )}

              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{status}</span>
              </div>

              {listedDate && (
                <div className="info-item">
                  <span className="info-label">Listed</span>
                  <span className="info-value">{listedDate}</span>
                </div>
              )}

              {sqft && (
                <div className="info-item">
                  <span className="info-label">Interior</span>
                  <span className="info-value">{sqft} sqft</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default PropertyDetailPage;
