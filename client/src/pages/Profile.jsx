import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from '../components/Loader.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    organization: user.organization || '',
    address: user.address || '',
    currentPassword: '',
    newPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({});
    try {
      const body = { ...form };
      if (!body.newPassword) {
        delete body.newPassword;
        delete body.currentPassword;
      }
      const { user: updated } = await api('/auth/me', { method: 'PUT', body });
      setUser(updated);
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }));
      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container page narrow">
      <h1>Your profile</h1>
      <p className="muted">
        {user.email} · <span className="capitalize">{user.role}</span> account
      </p>
      <Alert type={message.type}>{message.text}</Alert>

      <form className="card form-card" onSubmit={onSubmit}>
        <fieldset>
          <legend>Details</legend>
          <div className="form-grid">
            <label className="field">
              <span>Full name</span>
              <input required value={form.name} onChange={set('name')} />
            </label>
            <label className="field">
              <span>Organization</span>
              <input value={form.organization} onChange={set('organization')} />
            </label>
            <label className="field">
              <span>Phone</span>
              <input type="tel" value={form.phone} onChange={set('phone')} />
            </label>
            <label className="field">
              <span>Address / area</span>
              <input value={form.address} onChange={set('address')} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Change password</legend>
          <div className="form-grid">
            <label className="field">
              <span>Current password</span>
              <input type="password" autoComplete="current-password" value={form.currentPassword}
                onChange={set('currentPassword')} required={Boolean(form.newPassword)} />
            </label>
            <label className="field">
              <span>New password</span>
              <input type="password" autoComplete="new-password" minLength={6} value={form.newPassword}
                onChange={set('newPassword')} />
            </label>
          </div>
        </fieldset>
        <div className="btn-row end">
          <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}
