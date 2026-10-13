import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Circle, useMap } from 'react-leaflet';
import { categoryInfo, DEFAULT_CENTER } from '../utils/constants.js';
import { formatDistance, timeLeft } from '../utils/format.js';

const iconCache = {};
/** Emoji pin per food category. */
export function categoryIcon(category) {
  if (!iconCache[category]) {
    iconCache[category] = L.divIcon({
      className: 'map-pin-wrap',
      html: `<div class="map-pin cat-${category}"><span>${categoryInfo(category).emoji}</span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -32],
    });
  }
  return iconCache[category];
}

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function FitToContent({ points, userLocation, radiusKm }) {
  const map = useMap();
  const key = JSON.stringify([points, userLocation, radiusKm]);

  useEffect(() => {
    if (userLocation && radiusKm) {
      map.fitBounds(L.latLng(userLocation).toBounds(radiusKm * 2000), { padding: [20, 20] });
    } else if (points.length) {
      const all = userLocation ? [...points, userLocation] : points;
      map.fitBounds(all, { padding: [40, 40], maxZoom: 15 });
    } else if (userLocation) {
      map.setView(userLocation, 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/** Map of donation listings, with the user's position and search radius. */
export default function MapView({ donations, userLocation, radiusKm, height = 520 }) {
  const points = useMemo(
    () => donations.map((d) => [d.location.coordinates[1], d.location.coordinates[0]]),
    [donations]
  );

  return (
    <MapContainer center={userLocation || DEFAULT_CENTER} zoom={12} className="map" style={{ height }} scrollWheelZoom>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitToContent points={points} userLocation={userLocation} radiusKm={radiusKm} />

      {userLocation && (
        <>
          {radiusKm > 0 && (
            <Circle center={userLocation} radius={radiusKm * 1000} pathOptions={{ color: '#15803d', weight: 1, fillOpacity: 0.05 }} />
          )}
          <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
            <Popup>You are here</Popup>
          </CircleMarker>
        </>
      )}

      {donations.map((d, i) => (
        <Marker key={d._id} position={points[i]} icon={categoryIcon(d.category)}>
          <Popup>
            <div className="map-popup">
              <strong>{d.title}</strong>
              <div className="muted small">{d.donor?.organization || d.donor?.name}</div>
              <div className="small">
                {d.quantityAvailable} {d.unit} left · pick up {timeLeft(d.expiresAt)}
              </div>
              {d.distanceKm != null && <div className="small">{formatDistance(d.distanceKm)}</div>}
              <Link to={`/donations/${d._id}`}>View details →</Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
