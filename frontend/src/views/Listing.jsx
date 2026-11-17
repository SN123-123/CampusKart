'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rupee, CONDITIONS, timeAgo, getCategoryClass } from '@/lib/format';
import SoldButton from '@/components/SoldButton';

export default function ListingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [img, setImg] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/listings/${id}`)
      .then(setItem)
      .catch((e) => setError(e.message));
  }, [id, user]);

  async function messageSeller() {
    if (!user) {
      router.push('/login?from=' + encodeURIComponent(`/listings/${id}`));
      return;
    }
    try {
      const d = await api('/chats/start', { method: 'POST', body: { listingId: Number(id) } });
      router.push(`/chats?c=${d.id}`);
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleWish() {
    if (!user) {
      router.push('/login?from=' + encodeURIComponent(`/listings/${id}`));
      return;
    }
    try {
      const d = await api(`/listings/${id}/wishlist`, { method: 'POST' });
      setItem({ ...item, wished: d.wished });
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this listing permanently?')) return;
    try {
      await api(`/listings/${id}`, { method: 'DELETE' });
      router.push('/my-listings');
    } catch (e) {
      setError(e.message);
    }
  }

  if (error && !item) return <div className="error">{error}</div>;
  if (!item) return <div className="muted">Loading...</div>;

  const canDelete = Boolean(user && (item.is_owner || user.role === 'admin'));

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {item.status !== 'approved' && (
        <div className="error" style={{ background: '#fff3d1', color: '#8a5a00' }}>
          This listing is <b>{item.status}</b>
          {item.status === 'rejected' && item.reject_reason ? `: ${item.reject_reason}` : ''}. Only you and admins can see it.
        </div>
      )}
      <div className="detail">
        <div>
          {item.images.length ? (
            <img className="gallery-main" src={item.images[img]} alt={item.title} />
          ) : (
            <div className="gallery-main" />
          )}
          {item.images.length > 1 && (
            <div className="thumbs">
              {item.images.map((src, i) => (
                <img key={src} src={src} alt="" className={i === img ? 'on' : ''} onClick={() => setImg(i)} />
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="row" style={{ gap: 6 }}>
            <span className={`chip cond-${item.item_condition}`}>{CONDITIONS[item.item_condition]}</span>
            <span className={`chip ${getCategoryClass(item.category)}`}>{item.category}</span>
            {item.status === 'sold' && <span className="chip sold">sold</span>}
          </div>
          <h1 style={{ marginTop: 10 }}>{item.title}</h1>
          <div className="price" style={{ fontSize: 30, margin: '6px 0 14px' }}>
            {rupee(item.price)}
          </div>
          <div className="muted" style={{ marginBottom: 14 }}>
            Sold by <b>{item.seller_name}</b>
            {item.seller_branch ? ` (${item.seller_branch})` : ''} · listed {timeAgo(item.created_at)}
          </div>
          <div className="desc">{item.description}</div>
          {!item.is_owner && (
            <div className="muted" style={{ marginTop: 12 }}>
              {item.can_see_mobile && item.seller_mobile ? (
                <>Seller&apos;s mobile: <b>{item.seller_mobile}</b></>
              ) : (
                'Seller’s mobile number is shown after you message the seller.'
              )}
            </div>
          )}
          {item.status === 'sold' && item.is_owner && (
            <div className="muted" style={{ marginTop: 12 }}>
              {item.buyer_name ? `Sold to ${item.buyer_name}` : 'Sold outside CampusKart'}
            </div>
          )}
          {item.is_buyer && (
            <div className="success" style={{ marginTop: 12 }}>
              You bought this item from {item.seller_name}.
            </div>
          )}

          <div className="row" style={{ marginTop: 22, flexWrap: 'wrap', gap: 10 }}>
            {!item.is_owner && item.status === 'approved' && (
              <>
                <button className="btn" onClick={messageSeller}>Message seller</button>
                <button className="btn secondary" onClick={toggleWish}>
                  {item.wished ? '♥ In wishlist' : '♡ Add to wishlist'}
                </button>
              </>
            )}
            {item.is_owner && item.status === 'approved' && (
              <SoldButton listingId={id} onDone={() => setItem({ ...item, status: 'sold' })} />
            )}
            {canDelete && (
              <button className="btn danger" onClick={remove}>Delete listing</button>
            )}
          </div>

          {!user && item.status === 'approved' && (
            <div style={{ marginTop: 18, fontSize: 13, background: 'rgba(245, 158, 11, 0.08)', padding: '12px 16px', borderRadius: 8, border: '1px solid rgba(245, 158, 11, 0.25)', color: '#cbd5e1' }}>
              💡 Want to contact the seller or add this item to your wishlist?{' '}
              <Link href={`/login?from=${encodeURIComponent(`/listings/${id}`)}`} style={{ color: '#fbbf24', fontWeight: 700 }}>
                Log in
              </Link>{' '}
              or{' '}
              <Link href="/register" style={{ color: '#fbbf24', fontWeight: 700 }}>
                Register with PES email
              </Link>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
