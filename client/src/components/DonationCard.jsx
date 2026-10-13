import { Link } from 'react-router-dom';
import { categoryInfo, dietaryLabel } from '../utils/constants.js';
import { formatDistance, isUrgent, timeLeft } from '../utils/format.js';

export function FoodImage({ donation, className = '' }) {
  const cat = categoryInfo(donation.category);
  return donation.image ? (
    <img className={`food-img ${className}`} src={donation.image} alt={donation.title} loading="lazy" />
  ) : (
    <div className={`food-img food-img-placeholder cat-${donation.category} ${className}`} aria-hidden="true">
      {cat.emoji}
    </div>
  );
}

export default function DonationCard({ donation }) {
  const cat = categoryInfo(donation.category);
  const urgent = isUrgent(donation.expiresAt);

  return (
    <Link to={`/donations/${donation._id}`} className="card donation-card">
      <div className="donation-card-media">
        <FoodImage donation={donation} />
        <span className={`pill pill-time ${urgent ? 'urgent' : ''}`}>⏱ Pick up {timeLeft(donation.expiresAt)}</span>
      </div>
      <div className="donation-card-body">
        <div className="donation-card-meta">
          <span>
            {cat.emoji} {cat.label}
          </span>
          {donation.distanceKm != null && <span className="distance">📍 {formatDistance(donation.distanceKm)}</span>}
        </div>
        <h3>{donation.title}</h3>
        <p className="muted small clamp-1">{donation.donor?.organization || donation.donor?.name} · {donation.address}</p>
        <div className="donation-card-foot">
          <strong className="qty">
            {donation.quantityAvailable} <span>{donation.unit} left</span>
          </strong>
          <div className="tags">
            {donation.dietary?.slice(0, 2).map((d) => (
              <span key={d} className={`tag tag-${d}`}>{dietaryLabel(d)}</span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
