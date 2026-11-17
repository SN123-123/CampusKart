'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rupee } from '@/lib/format';
import SoldButton from '@/components/SoldButton';

export default function MyListings() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [posted, setPosted] = useState(false);

  async function load() {
    try {
      setItems((await api('/listings/mine')).items);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!user) return;
    setPosted(new URLSearchParams(window.location.search).get('posted') === '1');
    load();
  }, [user]);

  async function remove(id) {
    if (!window.confirm('Delete this listing permanently?')) return;
    try { await api(`/listings/${id}`, { method: 'DELETE' }); load(); } catch (e) { setError(e.message); }
  }

  if (!user) return null;

  return (
    <div>
      <div className="row">
        <h1>My listings</h1>
        <div className="spacer" />
        <Link href="/sell" className="btn">+ Sell something</Link>
      </div>
      {posted && <div className="success" style={{ marginTop: 14 }}>Submitted! You will get a notification once an admin approves it.</div>}
      {error && <div className="error">{error}</div>}
      {items && items.length === 0 && <div className="empty">You have not listed anything yet.</div>}
      <div style={{ marginTop: 16 }}>
        {(items || []).map((i) => (
          <div key={i.id} className="list-item">
            {i.image ? <img src={i.image} alt="" /> : <div style={{ width: 84, height: 64 }} />}
            <div style={{ flex: 1, minWidth: 180 }}>
              <Link href={`/listings/${i.id}`} style={{ fontWeight: 700 }}>{i.title}</Link>
              <div className="muted">{rupee(i.price)} · {i.category}</div>
              {i.status === 'rejected' && i.reject_reason && (
                <div style={{ color: 'var(--danger)', fontSize: 13 }}>Reason: {i.reject_reason}</div>
              )}
            </div>
            <span className={'chip ' + i.status}>{i.status}</span>
            {i.status === 'approved' && <SoldButton small listingId={i.id} onDone={load} />}
            <button className="btn danger small" onClick={() => remove(i.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
