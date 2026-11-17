'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rupee, CONDITIONS } from '@/lib/format';

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [s, p] = await Promise.all([api('/admin/stats'), api('/admin/pending')]);
      setStats(s);
      setPending(p.items);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (user && user.role === 'admin') load();
  }, [user]);

  async function approve(id) {
    try { await api(`/admin/listings/${id}/approve`, { method: 'POST' }); load(); } catch (e) { setError(e.message); }
  }
  async function reject(id) {
    const reason = window.prompt('Reason for rejecting (the seller will see this):', '');
    if (reason === null) return;
    try { await api(`/admin/listings/${id}/reject`, { method: 'POST', body: { reason } }); load(); } catch (e) { setError(e.message); }
  }

  if (!user) return null;
  if (user.role !== 'admin') return <div className="error">This page is for admins only.</div>;

  return (
    <div>
      <h1>Admin moderation</h1>
      {error && <div className="error">{error}</div>}
      {stats && (
        <div className="stats">
          <div className="stat"><b>{stats.students}</b>Students</div>
          <div className="stat"><b>{stats.pending}</b>Pending</div>
          <div className="stat"><b>{stats.approved}</b>Live</div>
          <div className="stat"><b>{stats.sold}</b>Sold</div>
          <div className="stat"><b>{stats.rejected}</b>Rejected</div>
        </div>
      )}
      <h2>Waiting for approval</h2>
      {pending.length === 0 && <div className="empty">All caught up.</div>}
      {pending.map((i) => (
        <div key={i.id} className="list-item" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>{i.title} · {rupee(i.price)}</div>
            <div className="muted">{i.category} · {CONDITIONS[i.item_condition]} · by {i.seller_name} ({i.seller_srn})</div>
            <p style={{ whiteSpace: 'pre-wrap' }}>{i.description}</p>
            <div className="admin-imgs">
              {i.images.map((src) => (<img key={src} src={src} alt="" />))}
            </div>
          </div>
          <div className="row">
            <button className="btn small" onClick={() => approve(i.id)}>Approve</button>
            <button className="btn danger small" onClick={() => reject(i.id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
