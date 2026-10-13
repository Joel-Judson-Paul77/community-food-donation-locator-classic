import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ClaimRequests from '../components/ClaimRequests.jsx';
import Loader, { Alert, EmptyState } from '../components/Loader.jsx';
import { FoodImage } from '../components/DonationCard.jsx';
import { formatDateTime, timeLeft } from '../utils/format.js';

const REQUEST_FILTERS = [
  { value: 'pending', label: 'Needs response' },
  { value: 'approved', label: 'Awaiting pickup' },
  { value: '', label: 'All' },
];

export default function DonorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState(null);
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState('requests');
  const [claimFilter, setClaimFilter] = useState('pending');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, l, c] = await Promise.all([
        api('/stats/me'),
        api('/donations/mine'),
        api('/claims/incoming', { query: { status: claimFilter } }),
      ]);
      setStats(s);
      setListings(l);
      setClaims(c);
    } catch (err) {
      setError(err.message);
    }
  }, [claimFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (!listings) return error ? <div className="container page"><Alert>{error}</Alert></div> : <Loader />;

  const pending = stats?.requests?.pending || 0;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Hi, {user.name.split(' ')[0]} 👋</h1>
          <p className="muted">{user.organization || 'Donor'} dashboard</p>
        </div>
        <Link to="/donate" className="btn btn-primary">+ Donate food</Link>
      </div>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="stats-grid">
        <StatCard icon="🟢" label="Active listings" value={stats?.listings?.available || 0} />
        <StatCard icon="🔔" label="Pending requests" value={pending} tone="orange" />
        <StatCard icon="📦" label="Items shared" value={stats?.itemsShared} tone="blue" />
        <StatCard icon="❤️" label="People helped" value={stats?.peopleHelped} tone="purple" />
      </div>

      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'requests'} className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>
          Requests {pending > 0 && <span className="count">{pending}</span>}
        </button>
        <button role="tab" aria-selected={tab === 'listings'} className={tab === 'listings' ? 'active' : ''} onClick={() => setTab('listings')}>
          My listings <span className="count muted-count">{listings.length}</span>
        </button>
      </div>

      {tab === 'requests' ? (
        <>
          <div className="chips">
            {REQUEST_FILTERS.map((f) => (
              <button key={f.value} className={`chip ${claimFilter === f.value ? 'active' : ''}`} onClick={() => setClaimFilter(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <ClaimRequests claims={claims} onChanged={load} onError={setError} />
        </>
      ) : listings.length ? (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Left</th>
                <th>Pick up by</th>
                <th>Requests</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((d) => (
                <tr key={d._id}>
                  <td>
                    <Link to={`/donations/${d._id}`} className="listing-cell">
                      <FoodImage donation={d} className="thumb" />
                      <span>{d.title}</span>
                    </Link>
                  </td>
                  <td>{d.quantityAvailable} / {d.quantity} {d.unit}</td>
                  <td>
                    {formatDateTime(d.expiresAt)}
                    {d.status === 'available' && <div className="muted small">{timeLeft(d.expiresAt)}</div>}
                  </td>
                  <td>
                    {d.claimCounts.pending ? <span className="badge badge-pending">{d.claimCounts.pending} new</span> : null}{' '}
                    {d.claimCounts.approved ? <span className="badge badge-approved">{d.claimCounts.approved} to collect</span> : null}
                    {!d.claimCounts.pending && !d.claimCounts.approved && <span className="muted">–</span>}
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon="🍲" title="You haven't listed any food yet">
          <Link to="/donate" className="btn btn-primary">Post your first donation</Link>
        </EmptyState>
      )}
    </div>
  );
}
