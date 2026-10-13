import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, dashboardPath } from '../context/AuthContext.jsx';
import { Alert } from '../components/Loader.jsx';

const ROLE_OPTIONS = [
  { value: 'donor', icon: '🍲', title: 'I have food to give', text: 'Restaurant, store, caterer, event or household' },
  { value: 'recipient', icon: '🤲', title: "I'm looking for food", text: 'NGO, shelter, community kitchen or individual' },
];

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    role: params.get('role') === 'donor' ? 'donor' : 'recipient',
    name: '',
    email: '',
    password: '',
    phone: '',
    organization: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={dashboardPath(user)} replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const u = await register(form);
      navigate(dashboardPath(u), { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card wide" onSubmit={onSubmit}>
        <h1>Create your account</h1>
        <p className="muted">It's free, and every meal shared counts.</p>
        <Alert>{error}</Alert>

        <div className="role-picker" role="radiogroup" aria-label="Account type">
          {ROLE_OPTIONS.map((r) => (
            <label key={r.value} className={`role-option ${form.role === r.value ? 'selected' : ''}`}>
              <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} />
              <span className="role-icon">{r.icon}</span>
              <strong>{r.title}</strong>
              <span className="muted small">{r.text}</span>
            </label>
          ))}
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Full name *</span>
            <input required value={form.name} onChange={set('name')} autoComplete="name" />
          </label>
          <label className="field">
            <span>Organization {form.role === 'donor' ? '(restaurant, store…)' : '(NGO, shelter…)'}</span>
            <input value={form.organization} onChange={set('organization')} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Email *</span>
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label className="field">
            <span>Phone</span>
            <input type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel"
              placeholder="Shared only after a request is approved" />
          </label>
          <label className="field span-2">
            <span>Address / area</span>
            <input value={form.address} onChange={set('address')} autoComplete="street-address" />
          </label>
          <label className="field span-2">
            <span>Password * (min. 6 characters)</span>
            <input type="password" required minLength={6} value={form.password} onChange={set('password')}
              autoComplete="new-password" />
          </label>
        </div>

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="center small">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
