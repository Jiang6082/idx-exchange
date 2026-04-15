import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import {
  fetchOpenHouses,
  fetchPropertyDetail,
  recordPropertyView
} from '../api/client';
import { useFavorites } from '../hooks/useFavorites';
import 'leaflet/dist/leaflet.css';
import './PropertyDetailPage.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

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

function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareMessage, setShareMessage] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

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
          setActivePhotoIndex(0);
        }

        await recordPropertyView(id);
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
  const photoUrls = property.media?.photos || getPhotoUrls(property);
  const activePhoto = photoUrls[activePhotoIndex] || null;
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
  const lotSize = property.LotSizeAcres || property.LotSizeSquareFeet || null;
  const status = property.StandardStatus || property.L_Status || 'Active';
  const listedDate = formatDate(property.ListingContractDate);
  const mortgageEstimate = calculateMortgage(property.L_SystemPrice);
  const lat = Number(property.LMD_MP_Latitude);
  const lng = Number(property.LMD_MP_Longitude);
  const hasMapCoordinates = !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
  const relatedProperties = property.relatedProperties || [];
  const timeline = property.timeline || [];
  const schools = property.schools || [];
  const commuteContext = property.commuteContext || null;
  const taxHistory = property.taxHistory || [];
  const priceHistory = property.priceHistory || [];
  const neighborhoodStats = property.neighborhoodStats || null;

  const galleryLabel =
    photoUrls.length > 0 ? `${activePhotoIndex + 1} / ${photoUrls.length}` : null;

  const handleFavoriteClick = async () => {
    if (favorite) {
      await removeFavorite(property.L_ListingID);
    } else {
      await addFavorite(property.L_ListingID);
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

          <div className="mortgage-card">
            <span className="section-kicker">Payment estimate</span>
            <strong>
              {mortgageEstimate
                ? `${formatCurrency(mortgageEstimate)} / month`
                : 'Unavailable'}
            </strong>
            <p>Estimated with 20% down, 30-year fixed, and a 6.5% interest rate.</p>
          </div>
        </div>

        <div className="property-image-main gallery-shell">
          {activePhoto ? (
            <>
              <button
                type="button"
                className="gallery-open-button"
                onClick={() => setLightboxOpen(true)}
              >
                <img src={activePhoto} alt={address} className="detail-main-image" />
              </button>
              {galleryLabel && <span className="gallery-counter">{galleryLabel}</span>}
              {photoUrls.length > 1 && (
                <div className="gallery-controls">
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((prev) =>
                        prev === 0 ? photoUrls.length - 1 : prev - 1
                      )
                    }
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActivePhotoIndex((prev) =>
                        prev === photoUrls.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="no-image">No image available</div>
          )}
        </div>
      </section>

      {photoUrls.length > 1 && (
        <div className="gallery-strip">
          {photoUrls.slice(0, 10).map((url, index) => (
            <button
              key={url}
              type="button"
              className={index === activePhotoIndex ? 'gallery-thumb active' : 'gallery-thumb'}
              onClick={() => setActivePhotoIndex(index)}
            >
              <img src={url} alt={`${address} ${index + 1}`} />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && activePhoto && (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setLightboxOpen(false)}
          >
            Close
          </button>
          <img
            src={activePhoto}
            alt={address}
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

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
                  <span className="detail-value">
                    {property.LotSizeAcres
                      ? `${property.LotSizeAcres} acres`
                      : `${Number(property.LotSizeSquareFeet).toLocaleString()} sqft`}
                  </span>
                </div>
              )}
              {listedDate && (
                <div className="detail-item">
                  <span className="detail-label">Listed</span>
                  <span className="detail-value">{listedDate}</span>
                </div>
              )}
              {property.DaysOnMarket && (
                <div className="detail-item">
                  <span className="detail-label">Days on Market</span>
                  <span className="detail-value">{property.DaysOnMarket}</span>
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

          <div className="property-section">
            <h2>Data Highlights</h2>
            <div className="detail-grid">
              {property.ParcelNumber && (
                <div className="detail-item">
                  <span className="detail-label">Parcel Number</span>
                  <span className="detail-value">{property.ParcelNumber}</span>
                </div>
              )}
              {property.HighSchoolDistrict && (
                <div className="detail-item">
                  <span className="detail-label">School District</span>
                  <span className="detail-value">{property.HighSchoolDistrict}</span>
                </div>
              )}
              {property.AssociationFee !== null && property.AssociationFee !== undefined && (
                <div className="detail-item">
                  <span className="detail-label">HOA Fee</span>
                  <span className="detail-value">
                    {property.AssociationFee > 0
                      ? `${formatCurrency(property.AssociationFee)} ${property.AssociationFeeFrequency || 'periodically'}`
                      : 'No HOA fee listed'}
                  </span>
                </div>
              )}
              {property.PreviousListPrice && (
                <div className="detail-item">
                  <span className="detail-label">Previous Price</span>
                  <span className="detail-value">{formatCurrency(property.PreviousListPrice)}</span>
                </div>
              )}
              {property.StatusChangeTimestamp && (
                <div className="detail-item">
                  <span className="detail-label">Status Updated</span>
                  <span className="detail-value">{formatDate(property.StatusChangeTimestamp)}</span>
                </div>
              )}
              {property.OriginalEntryTimestamp && (
                <div className="detail-item">
                  <span className="detail-label">First Entered</span>
                  <span className="detail-value">{formatDate(property.OriginalEntryTimestamp)}</span>
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

          {(property.InteriorFeatures ||
            property.Appliances ||
            property.CommunityFeatures ||
            property.LotFeatures) && (
            <div className="property-section">
              <h2>Expanded Home Data</h2>
              <div className="feature-pills">
                {[property.InteriorFeatures, property.Appliances, property.CommunityFeatures, property.LotFeatures]
                  .filter(Boolean)
                  .flatMap((value) => String(value).split(','))
                  .map((feature) => feature.trim())
                  .filter(Boolean)
                  .slice(0, 16)
                  .map((feature) => (
                    <span key={feature} className="feature-pill">
                      {feature}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="property-section">
              <h2>Listing Timeline</h2>
              <div className="timeline-list">
                {timeline.map((item) => (
                  <div key={`${item.label}-${item.date}`} className="timeline-item">
                    <strong>{item.label}</strong>
                    <span>{formatDate(item.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(schools.length > 0 || commuteContext || neighborhoodStats) && (
            <div className="property-section">
              <h2>Area Snapshot</h2>
              <div className="detail-grid">
                {schools.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="detail-item">
                    <span className="detail-label">{item.label}</span>
                    <span className="detail-value">{item.value}</span>
                  </div>
                ))}
                {neighborhoodStats?.listingCount ? (
                  <>
                    <div className="detail-item">
                      <span className="detail-label">Listings in this city</span>
                      <span className="detail-value">
                        {Number(neighborhoodStats.listingCount).toLocaleString()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Average area price</span>
                      <span className="detail-value">
                        {formatCurrency(neighborhoodStats.averagePrice)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Average area size</span>
                      <span className="detail-value">
                        {neighborhoodStats.averageSqft
                          ? `${Number(neighborhoodStats.averageSqft).toLocaleString()} sqft`
                          : 'Unavailable'}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
              {commuteContext && (
                <p className="property-description subtle-copy">
                  <strong>{commuteContext.primaryLabel}:</strong> {commuteContext.commuteScoreLabel}.{' '}
                  {(commuteContext.notes || []).join(' ')}
                </p>
              )}
            </div>
          )}

          {(priceHistory.length > 0 || taxHistory.length > 0) && (
            <div className="property-section">
              <h2>Price & Ownership Context</h2>
              <div className="timeline-list">
                {priceHistory.map((item) => (
                  <div key={`${item.label}-${item.date}-${item.amount}`} className="timeline-item">
                    <strong>{item.label}</strong>
                    <span>
                      {item.formattedAmount}
                      {item.date ? ` • ${formatDate(item.date)}` : ''}
                    </span>
                  </div>
                ))}
                {taxHistory.map((item) => (
                  <div key={`tax-${item.year}`} className="timeline-item">
                    <strong>{item.year} estimated tax</strong>
                    <span>
                      {formatCurrency(item.estimatedAnnualTax)} / year •{' '}
                      {formatCurrency(item.estimatedMonthlyTax)} / month
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {relatedProperties.length > 0 && (
            <div className="property-section">
              <h2>Nearby & Similar Homes</h2>
              <div className="related-grid">
                {relatedProperties.map((related) => {
                  const relatedPhoto = getPhotoUrls(related)[0] || null;
                  return (
                    <button
                      key={related.L_ListingID}
                      type="button"
                      className="related-card"
                      onClick={() => navigate(`/property/${related.L_ListingID}`)}
                    >
                      {relatedPhoto ? (
                        <img src={relatedPhoto} alt={related.L_Address} />
                      ) : (
                        <div className="related-placeholder">No image</div>
                      )}
                      <strong>{related.L_Address || related.L_AddressStreet}</strong>
                      <span>{formatCurrency(related.L_SystemPrice)}</span>
                      <span>{related.L_Keyword2 || '—'} beds • {related.LM_Dec_3 || '—'} baths</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="property-sidebar">
          {hasMapCoordinates && (
            <div className="listing-info-section">
              <div className="sidebar-card-header">
                <h3>Map View</h3>
              </div>
              <div className="detail-map-shell">
                <MapContainer
                  center={[lat, lng]}
                  zoom={14}
                  scrollWheelZoom={false}
                  className="detail-map"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[lat, lng]} />
                </MapContainer>
              </div>
            </div>
          )}

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
              {property.CountyOrParish && (
                <div className="info-item">
                  <span className="info-label">County</span>
                  <span className="info-value">{property.CountyOrParish}</span>
                </div>
              )}
              {property.ListAgentFullName && (
                <div className="info-item">
                  <span className="info-label">Listing Agent</span>
                  <span className="info-value">{property.ListAgentFullName}</span>
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
