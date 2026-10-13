const LABELS = {
  available: 'Available',
  reserved: 'Fully reserved',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Withdrawn',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Declined',
  collected: 'Collected',
};

export default function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{LABELS[status] || status}</span>;
}
