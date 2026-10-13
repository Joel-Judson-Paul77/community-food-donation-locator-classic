import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DonationCard from '../components/DonationCard.jsx';
import StatCard from '../components/StatCard.jsx';
import { CATEGORIES } from '../utils/constants.js';

const STEPS = [
  { icon: '📸', title: 'Post surplus', text: 'Restaurants, stores, caterers and households list extra food with a pickup time and location.' },
  { icon: '🗺️', title: 'Discover nearby', text: 'NGOs, shelters and people in need search the map for food close to them.' },
  { icon: '🤝', title: 'Request & collect', text: 'Recipients request what they need. Donors approve, share contact details and hand it over.' },
];

export default function Home() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [latest, setLatest] = useState([]);

  useEffect(() => {
    api('/stats/public').then(setStats).catch(() => {});
    api('/donations', { query: { limit: 6, sort: 'expiring' } })
      .then((d) => setLatest(d.items))
      .catch(() => {});
  }, []);

  const donateLink = user?.role === 'donor' ? '/donate' : user ? '/dashboard' : '/register?role=donor';

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Community food sharing</span>
            <h1>
              Good food should feed people, <span className="highlight">not landfills.</span>
            </h1>
            <p className="lead">
              FoodShare connects people and businesses that have surplus food with neighbours, shelters and NGOs that
              need it, using a live map of what's available near you right now.
            </p>
            <div className="btn-row">
              <Link to="/browse" className="btn btn-primary btn-lg">🔍 Find food near me</Link>
              <Link to={donateLink} className="btn btn-outline btn-lg">🍲 Donate surplus food</Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-bubble b1">🥖</div>
            <div className="hero-bubble b2">🍛</div>
            <div className="hero-bubble b3">🥕</div>
            <div className="hero-bubble b4">🥛</div>
            <div className="hero-plate">🍽️</div>
          </div>
        </div>
      </section>

      <section className="container section">
        <div className="stats-grid">
          <StatCard icon="🥗" label="Available right now" value={stats?.availableNow} />
          <StatCard icon="📦" label="Items shared" value={stats?.itemsShared} tone="orange" />
          <StatCard icon="🏪" label="Active donors" value={stats?.donors} tone="blue" />
          <StatCard icon="🏠" label="Recipients & NGOs" value={stats?.recipients} tone="purple" />
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <h2>Pick up soon</h2>
          <Link to="/browse">See all on the map →</Link>
        </div>
        {latest.length ? (
          <div className="card-grid">
            {latest.map((d) => <DonationCard key={d._id} donation={d} />)}
          </div>
        ) : (
          <p className="muted">No food listed right now. Check back soon!</p>
        )}
      </section>

      <section className="container section">
        <h2 className="center">How it works</h2>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div key={s.title} className="step card">
              <div className="step-num">{i + 1}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p className="muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container section">
        <h2 className="center">Browse by category</h2>
        <div className="category-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.value} to={`/browse?category=${c.value}`} className={`category-tile cat-${c.value}`}>
              <span>{c.emoji}</span>
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {!user && (
        <section className="container section">
          <div className="cta card">
            <div>
              <h2>Ready to make a difference?</h2>
              <p className="muted">Join as a donor to share surplus, or as a recipient to find food near you.</p>
            </div>
            <div className="btn-row">
              <Link to="/register?role=donor" className="btn btn-primary">I have food to give</Link>
              <Link to="/register?role=recipient" className="btn btn-outline">I'm looking for food</Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
