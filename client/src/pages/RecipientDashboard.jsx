import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Loader, { Alert, EmptyState } from '../components/Loader.jsx';
import { FoodImage } from '../components/DonationCard.jsx';
import { directionsUrl, formatDateTime, timeAgo, timeLeft } from '../utils/format.js';

const FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'history', label: 'History' },
];

export default function RecipientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState(null);
  const [filter, setFilter] = useState('active');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, c] = await Promise.all([api('/stats/me'), api('/claims/mine')]);
      setStats(s);
      setClaims(c);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async (claim) => {
    if (!window.confirm('Cancel this request?')) return;
    try {
      await api(`/claims/${claim._id}/cancel`, { method: 'PATCH' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!claims) return error ? <div className="container page"><Alert>{error}</Alert></div> : <Loader />;

  const active = (c) => ['pending', 'approved'].includes(c.status);
  const shown = claims.filter((c) => (filter === 'active' ? active(c) : !active(c)));

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">Track your food requests and pickups.</p>
        </div>
        <Link to="/browse" className="btn btn-primary">🔍 Find food</Link>
      </div>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="stats-grid">
        <StatCard icon="⏳" label="Pending" value={stats?.requests?.pending || 0} tone="orange" />
        <StatCard icon="✅" label="Ready to pick up" value={stats?.requests?.approved || 0} />
        <StatCard icon="🛍️" label="Pickups done" value={stats?.pickups} tone="blue" />
        <StatCard icon="📦" label="Items received" value={stats?.itemsReceived} tone="purple" />
      </div>

      <div className="tabs" role="tablist">
        {FILTERS.map((f) => (
          <button key={f.value} role="tab" aria-selected={filter === f.value} className={filter === f.value ? 'active' : ''}
            onClick={() => setFilter(f.value)}>
            {f.label} <span className="count muted-count">{claims.filter((c) => (f.value === 'active' ? active(c) : !active(c))).length}</span>
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="request-list">
          {shown.map((c) => (
            <li key={c._id} className="request">
              <div className="request-main">
                {c.donation ? (
                  <Link to={`/donations/${c.donation._id}`} className="listing-cell">
                    <FoodImage donation={c.donation} className="thumb" />
                    <div>
                      <strong>{c.donation.title}</strong>
                      <div className="muted small">
                        {c.donor?.organization || c.donor?.name} · {c.quantity} {c.donation.unit} · requested {timeAgo(c.createdAt)}
                      </div>
                    </div>
                  </Link>
                ) : (
                  <strong className="muted">Listing removed</strong>
                )}
                {c.status === 'approved' && c.donation && (
                  <div className="pickup-box">
                    <div>📍 {c.donation.address}</div>
                    <div>⏱ Pick up by {formatDateTime(c.donation.expiresAt)} ({timeLeft(c.donation.expiresAt)})</div>
                    {c.donor?.phone && <div>📞 <a href={`tel:${c.donor.phone}`}>{c.donor.phone}</a></div>}
                    <a href={directionsUrl(c.donation.location.coordinates)} target="_blank" rel="noreferrer">🧭 Directions</a>
                  </div>
                )}
                {c.donorNote && <div className="muted small">Donor: “{c.donorNote}”</div>}
              </div>
              <div className="request-actions">
                <StatusBadge status={c.status} />
                {active(c) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cancel(c)}>Cancel</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon="🧺" title={filter === 'active' ? 'No active requests' : 'No past requests yet'}>
          <Link to="/browse">Browse food available near you →</Link>
        </EmptyState>
      )}
    </div>
  );
}
