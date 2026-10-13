import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import Loader, { Alert } from '../components/Loader.jsx';
import { CATEGORIES, DIETARY, UNITS } from '../utils/constants.js';
import { toLocalInput } from '../utils/format.js';
import { geocode, reverseGeocode } from '../utils/geo.js';

const blank = () => ({
  title: '',
  description: '',
  category: 'cooked-meals',
  dietary: [],
  quantity: 10,
  unit: 'servings',
  expiresAt: toLocalInput(Date.now() + 4 * 3600 * 1000),
  address: '',
  pickupInstructions: '',
});

export default function DonationForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({ ...blank(), address: user?.address || '' }));
  const [location, setLocation] = useState(null);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) return;
    api(`/donations/${id}`)
      .then(({ donation: d }) => {
        setForm({
          title: d.title,
          description: d.description || '',
          category: d.category,
          dietary: d.dietary || [],
          quantity: d.quantity,
          unit: d.unit,
          expiresAt: toLocalInput(d.expiresAt),
          address: d.address,
          pickupInstructions: d.pickupInstructions || '',
        });
        setLocation({ lat: d.location.coordinates[1], lng: d.location.coordinates[0] });
        setPreview(d.image || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [editing, id]);

  useEffect(() => () => preview.startsWith('blob:') && URL.revokeObjectURL(preview), [preview]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const toggleDietary = (value) =>
    setForm((f) => ({
      ...f,
      dietary: f.dietary.includes(value) ? f.dietary.filter((d) => d !== value) : [...f.dietary, value],
    }));

  const onPickLocation = async (pos) => {
    setLocation(pos);
    if (!form.address.trim()) {
      const address = await reverseGeocode(pos);
      if (address) setForm((f) => (f.address.trim() ? f : { ...f, address }));
    }
  };

  const findAddress = async () => {
    if (!form.address.trim()) return setError('Type an address first');
    setFinding(true);
    setError('');
    try {
      setLocation(await geocode(form.address));
    } catch (err) {
      setError(err.message);
    } finally {
      setFinding(false);
    }
  };

  const onImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setError('Image must be smaller than 3 MB');
      e.target.value = '';
      return;
    }
    setImage(file);
    setRemoveImage(false);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!location) return setError('Please mark the pickup location on the map');
    setSubmitting(true);
    setError('');

    const fd = new FormData();
    for (const [key, value] of Object.entries(form)) {
      if (key === 'dietary') fd.append('dietary', value.join(','));
      else if (key === 'expiresAt') fd.append('expiresAt', new Date(value).toISOString());
      else fd.append(key, value);
    }
    fd.append('lat', location.lat);
    fd.append('lng', location.lng);
    if (image) fd.append('image', image);
    if (removeImage) fd.append('removeImage', 'true');

    try {
      const saved = await api(editing ? `/donations/${id}` : '/donations', { method: editing ? 'PUT' : 'POST', form: fd });
      navigate(`/donations/${saved._id}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="container page narrow">
      <h1>{editing ? 'Edit listing' : 'Donate surplus food'}</h1>
      <p className="muted">Share the details so people nearby can find and collect it in time.</p>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <form className="card form-card" onSubmit={onSubmit}>
        <fieldset>
          <legend>What are you donating?</legend>
          <label className="field">
            <span>Title *</span>
            <input required maxLength={100} value={form.title} onChange={set('title')}
              placeholder="e.g. Veg biryani from a cancelled event" />
          </label>
          <div className="form-grid">
            <label className="field">
              <span>Category *</span>
              <select value={form.category} onChange={set('category')}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </label>
            <div className="form-grid tight">
              <label className="field">
                <span>Quantity *</span>
                <input type="number" min={1} step={1} required value={form.quantity} onChange={set('quantity')} />
              </label>
              <label className="field">
                <span>Unit</span>
                <select value={form.unit} onChange={set('unit')}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="field">
            <span>Dietary info</span>
            <div className="chips">
              {DIETARY.map((d) => (
                <button key={d.value} type="button" className={`chip ${form.dietary.includes(d.value) ? 'active' : ''}`}
                  aria-pressed={form.dietary.includes(d.value)} onClick={() => toggleDietary(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea rows={3} maxLength={1000} value={form.description} onChange={set('description')}
              placeholder="How was it prepared or stored? Any allergens (nuts, dairy…)?" />
          </label>
          <div className="field">
            <span>Photo (optional, max 3 MB)</span>
            <div className="image-input">
              {preview && !removeImage && <img src={preview} alt="Preview" />}
              <div className="btn-col">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onImage} />
                {editing && preview && !image && !removeImage && (
                  <button type="button" className="link-btn small" onClick={() => setRemoveImage(true)}>Remove photo</button>
                )}
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend>When and where to pick up</legend>
          <label className="field">
            <span>Pick up by *</span>
            <input type="datetime-local" required value={form.expiresAt} onChange={set('expiresAt')}
              min={toLocalInput(Date.now())} />
          </label>
          <label className="field">
            <span>Pickup address *</span>
            <div className="input-with-btn">
              <input required maxLength={250} value={form.address} onChange={set('address')}
                placeholder="Building, street, area, city" />
              <button type="button" className="btn btn-outline btn-sm" onClick={findAddress} disabled={finding}>
                {finding ? 'Finding…' : 'Find on map'}
              </button>
            </div>
          </label>
          <LocationPicker value={location} onChange={onPickLocation} category={form.category} />
          <label className="field">
            <span>Pickup instructions</span>
            <input maxLength={300} value={form.pickupInstructions} onChange={set('pickupInstructions')}
              placeholder="e.g. Ask for the manager at the back entrance" />
          </label>
        </fieldset>

        <div className="btn-row end">
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
