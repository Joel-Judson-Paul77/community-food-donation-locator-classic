import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import DonationCard from '../components/DonationCard.jsx';
import MapView from '../components/MapView.jsx';
import Loader, { Alert, EmptyState } from '../components/Loader.jsx';
import { CATEGORIES, DIETARY } from '../utils/constants.js';
import { getCurrentPosition } from '../utils/geo.js';

const RADII = [2, 5, 10, 25, 50];
const PAGE_SIZE = 12;

export default function Browse() {
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [category, setCategory] = useState(params.get('category') || '');
  const [dietary, setDietary] = useState([]);
  const [radius, setRadius] = useState(10);
  const [sort, setSort] = useState('expiring');
  const [view, setView] = useState('list');
  const [page, setPage] = useState(1);

  const [location, setLocation] = useState(null);
  const [locStatus, setLocStatus] = useState('locating'); // locating | ok | denied
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const locate = () => {
    setLocStatus('locating');
    getCurrentPosition()
      .then((pos) => {
        setLocation([pos.lat, pos.lng]);
        setLocStatus('ok');
        setSort('distance');
      })
      .catch(() => setLocStatus('denied'));
  };
  useEffect(locate, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => setPage(1), [debouncedQ, category, dietary, radius, sort, location, view]);

  useEffect(() => {
    if (locStatus === 'locating') return;
    let cancelled = false;
    setLoading(true);
    api('/donations', {
      query: {
        q: debouncedQ,
        category,
        dietary: dietary.join(','),
        sort,
        page: view === 'map' ? 1 : page,
        limit: view === 'map' ? 100 : PAGE_SIZE,
        ...(location && { lat: location[0], lng: location[1], radius: radius || undefined }),
      },
    })
      .then((res) => !cancelled && (setData(res), setError('')))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, category, dietary, radius, sort, location, locStatus, view, page]);

  const toggleDietary = (value) =>
    setDietary((cur) => (cur.includes(value) ? cur.filter((d) => d !== value) : [...cur, value]));

  const clearFilters = () => {
    setQ('');
    setCategory('');
    setDietary([]);
    setRadius(10);
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Find surplus food</h1>
          <p className="muted">
            {locStatus === 'ok' && 'Showing food near your current location.'}
            {locStatus === 'locating' && 'Finding your location…'}
            {locStatus === 'denied' && (
              <>
                Location is off, so distances aren't shown.{' '}
                <button className="link-btn" onClick={locate}>Try again</button>
              </>
            )}
          </p>
        </div>
        <div className="segmented" role="tablist">
          <button role="tab" aria-selected={view === 'list'} className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            ☰ List
          </button>
          <button role="tab" aria-selected={view === 'map'} className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
            🗺 Map
          </button>
        </div>
      </div>

      <div className="filters card">
        <input
          className="search-input"
          type="search"
          placeholder="Search food, e.g. rice, bread, biryani…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search food"
        />
        <div className="filter-row">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} disabled={!location} aria-label="Distance"
            title={location ? '' : 'Allow location access to filter by distance'}>
            {RADII.map((r) => <option key={r} value={r}>Within {r} km</option>)}
            <option value={0}>Any distance</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
            {location && <option value="distance">Nearest first</option>}
            <option value="expiring">Pick up soonest</option>
            <option value="newest">Newest</option>
            <option value="quantity">Largest quantity</option>
          </select>
        </div>
        <div className="chips">
          {DIETARY.map((d) => (
            <button key={d.value} type="button" className={`chip ${dietary.includes(d.value) ? 'active' : ''}`}
              aria-pressed={dietary.includes(d.value)} onClick={() => toggleDietary(d.value)}>
              {d.label}
            </button>
          ))}
          {(q || category || dietary.length > 0) && (
            <button className="link-btn small" onClick={clearFilters}>Clear filters</button>
          )}
        </div>
      </div>

      <Alert>{error}</Alert>
      <p className="muted small results-count">
        {loading ? 'Searching…' : `${data.total} listing${data.total === 1 ? '' : 's'} found`}
      </p>

      {view === 'map' ? (
        <MapView donations={data.items} userLocation={location} radiusKm={location ? radius : 0} />
      ) : loading && !data.items.length ? (
        <Loader />
      ) : data.items.length ? (
        <>
          <div className="card-grid">
            {data.items.map((d) => <DonationCard key={d._id} donation={d} />)}
          </div>
          {data.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
              <span className="muted small">Page {page} of {data.pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon="🔍" title="No food matches your search">
          Try a wider distance or fewer filters.
        </EmptyState>
      )}
    </div>
  );
}
