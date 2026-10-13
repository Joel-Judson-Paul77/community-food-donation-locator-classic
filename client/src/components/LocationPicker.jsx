import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_CENTER } from '../utils/constants.js';
import { getCurrentPosition } from '../utils/geo.js';
import { categoryIcon, TILE_URL, TILE_ATTRIBUTION } from './MapView.jsx';

function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ value }) {
  const map = useMap();
  useEffect(() => {
    if (value) map.flyTo([value.lat, value.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);
  return null;
}

/**
 * Lets a donor set the pickup point: click the map, drag the pin, or use GPS.
 * value: { lat, lng } | null
 */
export default function LocationPicker({ value, onChange, category = 'other' }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');

  const useMyLocation = async () => {
    setLocating(true);
    setError('');
    try {
      onChange(await getCurrentPosition(), { fromGps: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="location-picker">
      <div className="location-picker-bar">
        <span className="muted small">
          {value ? `📍 ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Click on the map to drop the pickup pin'}
        </span>
        <button type="button" className="btn btn-outline btn-sm" onClick={useMyLocation} disabled={locating}>
          {locating ? 'Locating…' : '🎯 Use my location'}
        </button>
      </div>
      {error && <div className="field-error">{error}</div>}
      <MapContainer center={value ? [value.lat, value.lng] : DEFAULT_CENTER} zoom={value ? 15 : 12} className="map" style={{ height: 300 }}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <ClickToPlace onPick={onChange} />
        <FlyTo value={value} />
        {value && (
          <Marker
            position={[value.lat, value.lng]}
            icon={categoryIcon(category)}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const { lat, lng } = e.target.getLatLng();
                onChange({ lat, lng });
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
