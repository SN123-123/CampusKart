'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

// "Mark as sold" with a step to pick which student bought it.
// Only students who chatted with the seller about this item are offered.
export default function SoldButton({ listingId, onDone, small = false }) {
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState([]);
  const [buyerId, setBuyerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function start() {
    setError('');
    try {
      const d = await api(`/listings/${listingId}/buyers`);
      setBuyers(d.buyers);
      setBuyerId('');
      setOpen(true);
    } catch (e) {
      setError(e.message);
    }
  }

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await api(`/listings/${listingId}/sold`, {
        method: 'PATCH',
        body: buyerId ? { buyer_id: Number(buyerId) } : {},
      });
      setOpen(false);
      onDone && onDone();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  if (!open) {
    return (
      <>
        <button className={'btn' + (small ? ' small' : '')} onClick={start}>Mark as sold</button>
        {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
      </>
    );
  }

  return (
    <div className="row" style={{ background: '#fff7e0', border: '1px solid var(--line)', borderRadius: 10, padding: 10 }}>
      <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} style={{ width: 'auto', minWidth: 220 }}>
        <option value="">Sold outside CampusKart / not listed</option>
        {buyers.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <button className="btn small" onClick={confirm} disabled={busy}>{busy ? 'Saving...' : 'Confirm sold'}</button>
      <button className="btn secondary small" onClick={() => setOpen(false)}>Cancel</button>
      {buyers.length === 0 && (
        <span className="muted">Nobody has chatted with you about this item yet.</span>
      )}
      {error && <span style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</span>}
    </div>
  );
}
