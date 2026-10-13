/** Browser geolocation as a promise resolving to { lat, lng }. */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser does not support location access'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('Location access was denied or unavailable')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

// Free OpenStreetMap geocoder (no API key). Keep usage light, per its usage policy.
const NOMINATIM = 'https://nominatim.openstreetmap.org';

export async function geocode(address) {
  const res = await fetch(`${NOMINATIM}/search?format=json&limit=1&q=${encodeURIComponent(address)}`);
  const [hit] = await res.json();
  if (!hit) throw new Error('Address not found on the map. Try adding the area or city.');
  return { lat: Number(hit.lat), lng: Number(hit.lon) };
}

export async function reverseGeocode({ lat, lng }) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    return data.display_name || '';
  } catch {
    return '';
  }
}
