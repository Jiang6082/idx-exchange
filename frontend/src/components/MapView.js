import React from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

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
    return [34.0522, -118.2437];
  }

  const avgLat =
    propertiesWithCoords.reduce((sum, property) => sum + property.lat, 0) /
    propertiesWithCoords.length;

  const avgLng =
    propertiesWithCoords.reduce((sum, property) => sum + property.lng, 0) /
    propertiesWithCoords.length;

  return [avgLat, avgLng];
}

function MapView({ properties }) {
  const propertiesWithCoords = getValidCoordinates(properties);
  const center = getMapCenter(propertiesWithCoords);

  if (propertiesWithCoords.length === 0) {
    return (
      <div className="map-empty">
        No mappable properties found for the current results.
      </div>
    );
  }

  return (
    <div className="map-view-wrapper">
      <MapContainer center={center} zoom={10} scrollWheelZoom={true} className="map-container">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {propertiesWithCoords.map((property) => {
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
      </MapContainer>
    </div>
  );
}

export default MapView;