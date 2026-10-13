import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Loader, { Alert, EmptyState } from '../components/Loader.jsx';
import { CATEGORIES } from '../utils/constants.js';
import { formatDateTime, timeAgo } from '../utils/format.js';

const TABS = ['overview', 'users', 'listings', 'requests'];

function Pager({ data, page, setPage }) {
  if (!data || data.pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
      <span className="muted small">Page {page} of {data.pages} · {data.total} total</span>
      <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
    </div>
  );
}

/** Loads a paginated admin list whenever its filters change. */
function useAdminList(path, filters) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const key = JSON.stringify(filters);

  useEffect(() => setPage(1), [key]);

  const load = useCallback(() => {
    api(path, { query: { ...filters, page } })
      .then((d) => (setData(d), setError('')))
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return { data, page, setPage, reload: load, error, setError };
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/admin/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Loader />;

  const totalUsers = Object.values(stats.usersByRole).reduce((a, b) => a + b, 0);
  const totalListings = Object.values(stats.donationsByStatus).reduce((a, b) => a + b, 0);
  const maxCat = Math.max(1, ...Object.values(stats.donationsByCategory));

  return (
    <>
      <div className="stats-grid">
        <StatCard icon="👥" label={`Users (${stats.blockedUsers} blocked)`} value={totalUsers} tone="blue" />
        <StatCard icon="🍱" label="Total listings" value={totalListings} />
        <StatCard icon="📨" label="Pending requests" value={stats.claimsByStatus.pending || 0} tone="orange" />
        <StatCard icon="📦" label="Items shared" value={stats.itemsShared} tone="purple" />
      </div>

      <div className="admin-grid">
        <div className="card">
          <h3>Users by role</h3>
          <ul className="kv">
            {['donor', 'recipient', 'admin'].map((r) => (
              <li key={r}><span className="capitalize">{r}s</span><b>{stats.usersByRole[r] || 0}</b></li>
            ))}
            <li><span>New in last 7 days</span><b>{stats.last7Days.newUsers}</b></li>
          </ul>
        </div>
        <div className="card">
          <h3>Listings by status</h3>
          <ul className="kv">
            {['available', 'reserved', 'completed', 'expired', 'cancelled'].map((s) => (
              <li key={s}><StatusBadge status={s} /><b>{stats.donationsByStatus[s] || 0}</b></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Requests by status</h3>
          <ul className="kv">
            {['pending', 'approved', 'collected', 'rejected', 'cancelled'].map((s) => (
              <li key={s}><StatusBadge status={s} /><b>{stats.claimsByStatus[s] || 0}</b></li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Listings by category</h3>
          <ul className="bars">
            {CATEGORIES.map((c) => {
              const n = stats.donationsByCategory[c.value] || 0;
              return (
                <li key={c.value}>
                  <span className="bar-label">{c.emoji} {c.label}</span>
                  <span className="bar-track"><span className="bar-fill" style={{ width: `${(n / maxCat) * 100}%` }} /></span>
                  <b>{n}</b>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}

function Users() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const { data, page, setPage, reload, error, setError } = useAdminList('/admin/users', { q, role, status });

  const update = async (u, body) => {
    try {
      await api(`/admin/users/${u._id}`, { method: 'PATCH', body });
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name}? Their listings and requests will be deleted too.`)) return;
    try {
      await api(`/admin/users/${u._id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="filter-row">
        <input type="search" placeholder="Search name, email or organization" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
          <option value="">All roles</option>
          <option value="donor">Donors</option>
          <option value="recipient">Recipients</option>
          <option value="admin">Admins</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>
      <Alert onClose={() => setError('')}>{error}</Alert>
      {!data ? <Loader /> : data.items.length === 0 ? <EmptyState icon="👤" title="No users found" /> : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Joined</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id} className={u.isActive ? '' : 'row-muted'}>
                    <td>
                      <strong>{u.name}</strong> {self && <span className="muted small">(you)</span>}
                      <div className="muted small">{u.email}{u.organization && ` · ${u.organization}`}</div>
                    </td>
                    <td>
                      <select value={u.role} disabled={self} onChange={(e) => update(u, { role: e.target.value })} aria-label="Role">
                        <option value="donor">Donor</option>
                        <option value="recipient">Recipient</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="small">{timeAgo(u.createdAt)}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-available' : 'badge-cancelled'}`}>
                        {u.isActive ? 'Active' : 'Blocked'}
                      </span>
                    </td>
                    <td className="actions">
                      {!self && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => update(u, { isActive: !u.isActive })}>
                            {u.isActive ? 'Block' : 'Unblock'}
                          </button>
                          <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(u)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}

function Listings() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const { data, page, setPage, reload, error, setError } = useAdminList('/admin/donations', { q, status });

  const remove = async (d) => {
    if (!window.confirm(`Permanently delete "${d.title}" and its requests?`)) return;
    try {
      await api(`/admin/donations/${d._id}`, { method: 'DELETE' });
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="filter-row">
        <input type="search" placeholder="Search title or address" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {['available', 'reserved', 'completed', 'expired', 'cancelled'].map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>
      <Alert onClose={() => setError('')}>{error}</Alert>
      {!data ? <Loader /> : data.items.length === 0 ? <EmptyState icon="🍱" title="No listings found" /> : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr><th>Listing</th><th>Donor</th><th>Qty</th><th>Pick up by</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {data.items.map((d) => (
                <tr key={d._id}>
                  <td><Link to={`/donations/${d._id}`}>{d.title}</Link></td>
                  <td className="small">
                    {d.donor?.organization || d.donor?.name}
                    <div className="muted">{d.donor?.email}</div>
                  </td>
                  <td className="small">{d.quantityAvailable}/{d.quantity} {d.unit}</td>
                  <td className="small">{formatDateTime(d.expiresAt)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td className="actions">
                    <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}

function Requests() {
  const [status, setStatus] = useState('');
  const { data, page, setPage, error } = useAdminList('/admin/claims', { status });

  return (
    <>
      <div className="filter-row">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Any status</option>
          {['pending', 'approved', 'collected', 'rejected', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <Alert>{error}</Alert>
      {!data ? <Loader /> : data.items.length === 0 ? <EmptyState icon="📨" title="No requests found" /> : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr><th>Listing</th><th>Recipient</th><th>Donor</th><th>Qty</th><th>When</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c._id}>
                  <td>{c.donation ? <Link to={`/donations/${c.donation._id}`}>{c.donation.title}</Link> : '–'}</td>
                  <td className="small">{c.recipient?.organization || c.recipient?.name || '–'}</td>
                  <td className="small">{c.donor?.organization || c.donor?.name || '–'}</td>
                  <td className="small">{c.quantity} {c.donation?.unit}</td>
                  <td className="small">{timeAgo(c.createdAt)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager data={data} page={page} setPage={setPage} />
    </>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const panels = { overview: Overview, users: Users, listings: Listings, requests: Requests };
  const Panel = panels[tab];

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Admin dashboard</h1>
          <p className="muted">Manage users, listings and requests across the platform.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`capitalize ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <Panel />
    </div>
  );
}
