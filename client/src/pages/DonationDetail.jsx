import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { FoodImage } from '../components/DonationCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ClaimRequests from '../components/ClaimRequests.jsx';
import Loader, { Alert, EmptyState } from '../components/Loader.jsx';
import { categoryIcon, TILE_URL, TILE_ATTRIBUTION } from '../components/MapView.jsx';
import { categoryInfo, dietaryLabel } from '../utils/constants.js';
import { directionsUrl, formatDateTime, isUrgent, timeAgo, timeLeft } from '../utils/format.js';

function RequestForm({ donation, onDone }) {
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api('/claims', { method: 'POST', body: { donationId: donation._id, quantity, message } });
      await onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="request-form">
      <h3>Request this food</h3>
      <Alert>{error}</Alert>
      <label className="field">
        <span>How much do you need? ({donation.unit}, max {donation.quantityAvailable})</span>
        <input type="number" min={1} max={donation.quantityAvailable} step={1} required value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))} />
      </label>
      <label className="field">
        <span>Message to donor</span>
        <textarea rows={3} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Who is it for, and when can you pick it up?" />
      </label>
      <button className="btn btn-primary btn-block" disabled={submitting}>
        {submitting ? 'Sending…' : 'Send request'}
      </button>
    </form>
  );
}

function MyRequest({ claim, donation, onChanged }) {
  const [error, setError] = useState('');
  const cancel = async () => {
    if (!window.confirm('Cancel your request?')) return;
    try {
      await api(`/claims/${claim._id}/cancel`, { method: 'PATCH' });
      await onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const messages = {
    pending: 'Your request has been sent. The donor will review it shortly.',
    approved: 'Approved! Contact the donor and pick up the food before the deadline.',
    collected: 'You collected this food. Enjoy!',
    rejected: 'The donor declined this request.',
    cancelled: 'You cancelled this request.',
  };

  return (
    <div className={`my-request status-${claim.status}`}>
      <div className="row-between">
        <h3>Your request</h3>
        <StatusBadge status={claim.status} />
      </div>
      <Alert>{error}</Alert>
      <p>
        <b>{claim.quantity} {donation.unit}</b> · sent {timeAgo(claim.createdAt)}
      </p>
      <p className="muted">{messages[claim.status]}</p>
      {claim.donorNote && <p className="note">Donor: “{claim.donorNote}”</p>}
      {['pending', 'approved'].includes(claim.status) && (
        <button className="btn btn-ghost btn-sm" onClick={cancel}>Cancel request</button>
      )}
    </div>
  );
}

export default function DonationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api(`/donations/${id}`);
      setData(res);
      if (res.isOwner) setClaims(await api('/claims/incoming', { query: { donation: id } }));
    } catch (err) {
      if (err.status === 404 || err.status === 400) setNotFound(true);
      else setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load, user]);

  if (notFound) {
    return (
      <div className="container page">
        <EmptyState icon="🥡" title="Listing not found">
          It may have been removed. <Link to="/browse">Browse other food</Link>
        </EmptyState>
      </div>
    );
  }
  if (!data) return error ? <div className="container page"><Alert>{error}</Alert></div> : <Loader />;

  const { donation, myClaim, isOwner } = data;
  const cat = categoryInfo(donation.category);
  const [lng, lat] = donation.location.coordinates;
  const open = donation.status === 'available';
  const canManage = isOwner || user?.role === 'admin';
  const activeClaim = myClaim && ['pending', 'approved', 'collected'].includes(myClaim.status);

  const ownerAction = async (action, confirmText) => {
    if (!window.confirm(confirmText)) return;
    try {
      await api(`/donations/${donation._id}/${action}`, { method: 'PATCH' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container page">
      <button className="link-btn back" onClick={() => navigate(-1)}>← Back</button>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="detail-grid">
        <div>
          <FoodImage donation={donation} className="detail-img" />

          <div className="card detail-card">
            <div className="row-between">
              <span className="muted">{cat.emoji} {cat.label}</span>
              <StatusBadge status={donation.status} />
            </div>
            <h1>{donation.title}</h1>
            <div className="tags">
              {donation.dietary?.map((d) => <span key={d} className={`tag tag-${d}`}>{dietaryLabel(d)}</span>)}
            </div>

            <div className="facts">
              <div>
                <span className="muted small">Available</span>
                <strong>{donation.quantityAvailable} / {donation.quantity} {donation.unit}</strong>
              </div>
              <div>
                <span className="muted small">Pick up by</span>
                <strong className={isUrgent(donation.expiresAt) ? 'text-urgent' : ''}>
                  {formatDateTime(donation.expiresAt)}
                  {open && <span className="muted small"> ({timeLeft(donation.expiresAt)})</span>}
                </strong>
              </div>
              <div>
                <span className="muted small">Posted</span>
                <strong>{timeAgo(donation.createdAt)}</strong>
              </div>
            </div>

            {donation.description && <p className="description">{donation.description}</p>}

            <h3>Pickup</h3>
            <p>📍 {donation.address}</p>
            {donation.pickupInstructions && <p className="muted">ℹ️ {donation.pickupInstructions}</p>}
            <a className="btn btn-outline btn-sm" href={directionsUrl(donation.location.coordinates)} target="_blank" rel="noreferrer">
              🧭 Get directions
            </a>
          </div>
        </div>

        <aside className="detail-side">
          <div className="card">
            <h3>Donated by</h3>
            <div className="donor-row">
              <span className="avatar">{donation.donor.name[0]}</span>
              <div>
                <strong>{donation.donor.organization || donation.donor.name}</strong>
                {donation.donor.organization && <div className="muted small">{donation.donor.name}</div>}
              </div>
            </div>
            {donation.donor.phone ? (
              <p>📞 <a href={`tel:${donation.donor.phone}`}>{donation.donor.phone}</a></p>
            ) : (
              <p className="muted small">Contact details are shared once your request is approved.</p>
            )}
          </div>

          <div className="card">
            {canManage ? (
              <div className="owner-actions">
                <h3>Manage listing</h3>
                <div className="btn-col">
                  {['available', 'reserved', 'expired'].includes(donation.status) && (
                    <Link to={`/donations/${donation._id}/edit`} className="btn btn-outline btn-block">✏️ Edit listing</Link>
                  )}
                  {!['completed', 'cancelled'].includes(donation.status) && (
                    <>
                      <button className="btn btn-outline btn-block"
                        onClick={() => ownerAction('complete', 'Mark this listing as completed? Pending requests will be declined.')}>
                        ✅ Mark as completed
                      </button>
                      <button className="btn btn-danger-ghost btn-block"
                        onClick={() => ownerAction('cancel', 'Withdraw this listing? All open requests will be cancelled.')}>
                        Withdraw listing
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : myClaim && (activeClaim || !open) ? (
              <MyRequest claim={myClaim} donation={donation} onChanged={load} />
            ) : !open ? (
              <p className="muted">This listing is no longer accepting requests.</p>
            ) : user?.role === 'recipient' ? (
              <>
                {myClaim && <MyRequest claim={myClaim} donation={donation} onChanged={load} />}
                <RequestForm donation={donation} onDone={load} />
              </>
            ) : user ? (
              <p className="muted">Only recipient accounts can request food.</p>
            ) : (
              <div className="center">
                <p>Want this food?</p>
                <Link to="/login" state={{ from: `/donations/${donation._id}` }} className="btn btn-primary btn-block">
                  Log in to request
                </Link>
                <p className="small muted">
                  No account? <Link to="/register?role=recipient">Sign up as a recipient</Link>
                </p>
              </div>
            )}
          </div>

          <div className="card card-flush">
            <MapContainer center={[lat, lng]} zoom={15} className="map" style={{ height: 220 }} scrollWheelZoom={false}>
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <Marker position={[lat, lng]} icon={categoryIcon(donation.category)} />
            </MapContainer>
          </div>
        </aside>
      </div>

      {isOwner && (
        <section className="section">
          <h2>Requests for this listing ({claims.length})</h2>
          <ClaimRequests claims={claims} onChanged={load} showListing={false} onError={setError} />
        </section>
      )}
    </div>
  );
}
