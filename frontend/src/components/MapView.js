import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { fetchMapProperties } from '../api/client';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

const DEFAULT_CENTER = [34.0522, -118.2437];
const DEFAULT_ZOOM = 10;

function formatCompactPrice(value) {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount <= 0) {
    return 'Home';
  }

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount >= 10000000 ? 0 : 1)}M`;
  }

  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }

  return `$${amount}`;
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'small' : count < 40 ? 'medium' : 'large';
  const sizePx = count < 10 ? 38 : count < 40 ? 44 : 50;

  return L.divIcon({
    html: `
      <div class="map-cluster map-cluster-${size}">
        <strong class="map-cluster-count">${count.toLocaleString()}</strong>
      </div>
    `,
    className: 'map-cluster-icon-shell',
    iconSize: L.point(sizePx, sizePx, true)
  });
}

function createPropertyPriceIcon(property) {
  const label = formatCompactPrice(property?.summary?.price || property?.L_SystemPrice);

  return L.divIcon({
    html: `
      <div class="price-marker">
        <span class="price-marker-pill">${label}</span>
        <span class="price-marker-tip"></span>
      </div>
    `,
    className: 'price-marker-shell',
    iconSize: [66, 34],
    iconAnchor: [33, 34],
    popupAnchor: [0, -28]
  });
}

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

function getValidCoordinates(properties) {
  return properties
    .filter((property) => {
      const lat = Number(property.LMD_MP_Latitude);
      const lng = Number(property.LMD_MP_Longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng) && lat !== 0 && lng !== 0;
    })
    .map((property) => ({
      ...property,
      lat: Number(property.LMD_MP_Latitude),
      lng: Number(property.LMD_MP_Longitude)
    }));
}

function getMapCenter(propertiesWithCoords) {
  if (propertiesWithCoords.length === 0) {
    return DEFAULT_CENTER;
  }

  const avgLat =
    propertiesWithCoords.reduce((sum, property) => sum + property.lat, 0) /
    propertiesWithCoords.length;

  const avgLng =
    propertiesWithCoords.reduce((sum, property) => sum + property.lng, 0) /
    propertiesWithCoords.length;

  return [avgLat, avgLng];
}

function getBoundsFromProperties(propertiesWithCoords) {
  if (propertiesWithCoords.length === 0) {
    return null;
  }

  const latitudes = propertiesWithCoords.map((property) => property.lat);
  const longitudes = propertiesWithCoords.map((property) => property.lng);

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)]
  ];
}

function getMapFetchLimit(zoom) {
  if (zoom <= 8) {
    return 150;
  }

  if (zoom <= 10) {
    return 300;
  }

  if (zoom <= 12) {
    return 500;
  }

  return 1000;
}

function formatVisibleCount(value) {
  return Number(value || 0).toLocaleString();
}

function parseBoundsString(boundsValue) {
  if (!boundsValue) {
    return null;
  }

  const values = String(boundsValue)
    .split(',')
    .map((value) => Number(value));

  if (values.length !== 4 || values.some((value) => Number.isNaN(value))) {
    return null;
  }

  return [
    [values[1], values[3]],
    [values[0], values[2]]
  ];
}

function MapViewportWatcher({ initialBounds, initialZoom, onViewportChange }) {
  const initializedRef = useRef(false);

  const map = useMapEvents({
    moveend() {
      onViewportChange(map);
    },
    zoomend() {
      onViewportChange(map);
    }
  });

  React.useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    if (initialBounds) {
      map.fitBounds(initialBounds, { padding: [40, 40] });
    } else if (initialZoom) {
      map.setZoom(initialZoom);
    } else {
      onViewportChange(map);
    }
  }, [initialBounds, initialZoom, map, onViewportChange]);

  React.useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    onViewportChange(map);
  }, [map, onViewportChange]);

  return null;
}

function MapView({
  initialProperties,
  filters,
  favorites,
  showFavoritesOnly,
  initialViewport,
  onViewportStateChange
}) {
  const initialPropertiesWithCoords = useMemo(
    () => getValidCoordinates(initialProperties),
    [initialProperties]
  );
  const initialCenter = useMemo(
    () => getMapCenter(initialPropertiesWithCoords),
    [initialPropertiesWithCoords]
  );
  const initialBounds = useMemo(
    () =>
      parseBoundsString(initialViewport?.bounds) ||
      getBoundsFromProperties(initialPropertiesWithCoords),
    [initialPropertiesWithCoords, initialViewport?.bounds]
  );
  const initialZoom = useMemo(
    () => Number(initialViewport?.zoom) || DEFAULT_ZOOM,
    [initialViewport?.zoom]
  );

  const [rawMapProperties, setRawMapProperties] = useState(initialPropertiesWithCoords);
  const [mapMeta, setMapMeta] = useState({
    totalInView: initialPropertiesWithCoords.length,
    fetchedCount: initialPropertiesWithCoords.length,
    limit: initialPropertiesWithCoords.length || getMapFetchLimit(DEFAULT_ZOOM),
    zoom: DEFAULT_ZOOM
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  const displayedProperties = useMemo(
    () =>
      showFavoritesOnly
        ? rawMapProperties.filter((property) => favorites.includes(property.L_ListingID))
        : rawMapProperties,
    [favorites, rawMapProperties, showFavoritesOnly]
  );

  const fetchViewportProperties = useCallback(
    async (map) => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const limit = getMapFetchLimit(zoom);
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchMapProperties({
          ...filters,
          limit,
          offset: 0,
          north: bounds.getNorth().toFixed(6),
          south: bounds.getSouth().toFixed(6),
          east: bounds.getEast().toFixed(6),
          west: bounds.getWest().toFixed(6)
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        const nextProperties = getValidCoordinates(data.results || []);

        setRawMapProperties(nextProperties);
        setMapMeta({
          totalInView: data.total || 0,
          fetchedCount: nextProperties.length,
          limit: data.limit || limit,
          zoom
        });
        onViewportStateChange?.({
          bounds: [
            bounds.getNorth().toFixed(5),
            bounds.getSouth().toFixed(5),
            bounds.getEast().toFixed(5),
            bounds.getWest().toFixed(5)
          ].join(','),
          zoom
        });
      } catch (fetchError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setError('Unable to load listings for this area right now.');
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [filters, onViewportStateChange]
  );

  const isCapped = mapMeta.totalInView > mapMeta.fetchedCount;

  return (
    <div className="map-view-wrapper">
      <div className="map-status-card">
        <div>
          <p className="map-status-title">
            {showFavoritesOnly
              ? `Showing ${formatVisibleCount(displayedProperties.length)} saved homes in this area`
              : `Showing ${formatVisibleCount(displayedProperties.length)} listings in the current map area`}
          </p>
          <p className="map-status-subtitle">
            Pan or zoom to load more homes where you are looking.
            {!showFavoritesOnly && isCapped
              ? ' Zoom in to reveal additional listings in dense areas.'
              : ''}
          </p>
        </div>

        <div className="map-status-meta">
          {!showFavoritesOnly && (
            <span>{formatVisibleCount(mapMeta.totalInView)} matches in view</span>
          )}
          <span>Zoom level {mapMeta.zoom}</span>
        </div>
      </div>

      {error && <div className="map-empty">{error}</div>}

      <div className="map-container-shell">
        {loading && <div className="map-loading-badge">Updating map…</div>}

        <MapContainer
          center={initialCenter}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="map-container"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapViewportWatcher
            initialBounds={initialBounds}
            initialZoom={initialZoom}
            onViewportChange={fetchViewportProperties}
          />

          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={true}
            spiderfyOnMaxZoom={true}
            maxClusterRadius={60}
            spiderLegPolylineOptions={{ weight: 2, color: '#0f766e', opacity: 0.6 }}
            iconCreateFunction={createClusterIcon}
          >
            {displayedProperties.map((property) => {
            const photoUrl = getFirstPhotoUrl(property);
            const address =
              property.L_Address || property.L_AddressStreet || 'Address unavailable';

            const city = property.L_City || 'Unknown City';
            const state = property.L_State || '';

            const price =
              property.L_SystemPrice !== null && property.L_SystemPrice !== undefined
                ? Number(property.L_SystemPrice).toLocaleString()
                : 'N/A';

            return (
              <Marker
                key={property.L_ListingID}
                position={[property.lat, property.lng]}
                icon={createPropertyPriceIcon(property)}
              >
                <Popup>
                  <div className="map-popup">
                    {photoUrl ? (
                      <img src={photoUrl} alt={address} className="map-popup-image" />
                    ) : (
                      <div className="map-popup-no-image">No image available</div>
                    )}

                    <div className="map-popup-price">${price}</div>
                    <div className="map-popup-address">{address}</div>
                    <div className="map-popup-city">
                      {city}
                      {state ? `, ${state}` : ''}
                    </div>
                    <Link to={`/property/${property.L_ListingID}`} className="map-popup-link">
                      View details
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
            })}
          </MarkerClusterGroup>
        </MapContainer>
      </div>

      {!loading && displayedProperties.length === 0 && !error && (
        <div className="map-empty">
          {showFavoritesOnly
            ? 'No saved listings are visible in this part of the map yet.'
            : 'No listings are currently visible in this map area. Try panning or zooming out.'}
        </div>
      )}
    </div>
  );
}

export default MapView;
