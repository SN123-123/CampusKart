'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Sell() {
  const { user } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ title: '', category_id: '', price: '', item_condition: 'good', description: '' });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    if (!user) return;
    api('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, [user]);

  function pickFiles(e) {
    const list = Array.from(e.target.files).slice(0, 4);
    setFiles(list);
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!files.length) return setError('Add at least one photo');
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append('images', f));
      await api('/listings', { method: 'POST', form: fd });
      router.push('/my-listings?posted=1');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <h1>Sell an item</h1>
      <div className="muted" style={{ marginBottom: 18 }}>An admin reviews every listing before it goes live.</div>
      <form className="panel" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Title</label>
          <input value={form.title} onChange={set('title')} maxLength={150} required />
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>Category</label>
            <select value={form.category_id} onChange={set('category_id')} required>
              <option value="">Choose...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1, minWidth: 140 }}>
            <label>Price (₹)</label>
            <input type="number" min="0" value={form.price} onChange={set('price')} required />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>Condition</label>
            <select value={form.item_condition} onChange={set('item_condition')}>
              <option value="new">Brand new</option>
              <option value="like_new">Like new</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea value={form.description} onChange={set('description')} required />
        </div>
        <div className="field">
          <label>Photos (up to 4, JPG/PNG/WebP, 4 MB each)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles} />
          <div className="admin-imgs">
            {files.map((f, i) => (
              <img key={i} src={URL.createObjectURL(f)} alt="preview" />
            ))}
          </div>
        </div>
        <button className="btn" disabled={busy}>{busy ? 'Submitting...' : 'Submit for approval'}</button>
      </form>
    </div>
  );
}
