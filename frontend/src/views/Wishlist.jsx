'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ListingCard from '@/components/ListingCard';

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api('/listings/wishlist/all').then((d) => setItems(d.items)).catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <h1>My wishlist</h1>
      {error && <div className="error">{error}</div>}
      {items && items.length === 0 && <div className="empty">Nothing saved yet. Tap the heart on any listing.</div>}
      <div className="grid" style={{ marginTop: 16 }}>
        {(items || []).map((i) => (
          <ListingCard key={i.id} item={i} />
        ))}
      </div>
    </div>
  );
}
