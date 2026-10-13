import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import StatusBadge from './StatusBadge.jsx';
import { EmptyState } from './Loader.jsx';
import { timeAgo } from '../utils/format.js';

/** Incoming requests a donor can approve, decline, or mark as collected. */
export default function ClaimRequests({ claims, onChanged, showListing = true, onError }) {
  const [busy, setBusy] = useState(null);

  const act = async (claim, action) => {
    let note;
    if (action === 'reject') {
      note = window.prompt('Optional: tell the recipient why (e.g. "Already given away")', '');
      if (note === null) return;
    }
    setBusy(claim._id + action);
    try {
      await api(`/claims/${claim._id}/${action}`, { method: 'PATCH', body: note ? { note } : {} });
      await onChanged?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (!claims.length) {
    return <EmptyState icon="📭" title="No requests here">Requests from recipients will show up here.</EmptyState>;
  }

  return (
    <ul className="request-list">
      {claims.map((c) => (
        <li key={c._id} className="request">
          <div className="request-main">
            <div className="request-head">
              <span className="avatar avatar-sm">{c.recipient?.name?.[0]?.toUpperCase() || '?'}</span>
              <div>
                <strong>{c.recipient?.name || 'Deleted user'}</strong>
                {c.recipient?.organization && <span className="muted"> · {c.recipient.organization}</span>}
                <div className="muted small">
                  wants <b>{c.quantity} {c.donation?.unit}</b>
                  {showListing && c.donation && (
                    <> of <Link to={`/donations/${c.donation._id}`}>{c.donation.title}</Link></>
                  )}{' '}
                  · {timeAgo(c.createdAt)}
                </div>
              </div>
            </div>
            {c.message && <p className="request-message">“{c.message}”</p>}
            {['approved', 'collected'].includes(c.status) && c.recipient?.phone && (
              <div className="small">📞 <a href={`tel:${c.recipient.phone}`}>{c.recipient.phone}</a></div>
            )}
            {c.donorNote && <div className="muted small">Your note: {c.donorNote}</div>}
          </div>
          <div className="request-actions">
            <StatusBadge status={c.status} />
            {c.status === 'pending' && (
              <div className="btn-row">
                <button className="btn btn-primary btn-sm" disabled={!!busy} onClick={() => act(c, 'approve')}>
                  {busy === c._id + 'approve' ? '…' : 'Approve'}
                </button>
                <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => act(c, 'reject')}>
                  Decline
                </button>
              </div>
            )}
            {c.status === 'approved' && (
              <button className="btn btn-outline btn-sm" disabled={!!busy} onClick={() => act(c, 'collect')}>
                {busy === c._id + 'collect' ? '…' : '✓ Mark collected'}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
