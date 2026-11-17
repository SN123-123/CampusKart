'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { rupee } from '@/lib/format';

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr);
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m} month${m > 1 ? 's' : ''} ago`;
  return `${Math.floor(m / 12)} year${Math.floor(m / 12) > 1 ? 's' : ''} ago`;
}

function DealCard({ item, role }) {
  /* role: 'buyer' | 'seller' */
  return (
    <Link href={`/listings/${item.id}`} className="deal-card">
      <div className="deal-card-img">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : (
          <div className="deal-card-no-img">📦</div>
        )}
        <span className="deal-badge">SOLD</span>
      </div>
      <div className="deal-card-body">
        <div className="deal-price">{rupee(item.price)}</div>
        <div className="deal-title">{item.title}</div>
        <div className="deal-meta">
          <span className="deal-category">{item.category}</span>
          {role === 'buyer' && item.seller_name && (
            <span className="deal-party">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="5"/></svg>
              from {item.seller_name}
            </span>
          )}
          {role === 'seller' && item.buyer_name && (
            <span className="deal-party">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="5"/></svg>
              to {item.buyer_name}
            </span>
          )}
          {role === 'seller' && !item.buyer_name && (
            <span className="deal-party muted">buyer not recorded</span>
          )}
        </div>
        <div className="deal-time">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {timeAgo(item.sold_at)}
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ tab }) {
  return (
    <div className="deals-empty">
      <div className="deals-empty-icon">{tab === 'bought' ? '🛍️' : '🏷️'}</div>
      <div className="deals-empty-title">
        {tab === 'bought' ? 'No purchases yet' : 'Nothing sold yet'}
      </div>
      <div className="deals-empty-sub">
        {tab === 'bought'
          ? 'When a seller marks an item as sold to you, it shows up here.'
          : 'Mark one of your approved listings as sold from the My Listings page.'}
      </div>
      {tab === 'bought' ? (
        <Link href="/" className="btn" style={{ marginTop: 16 }}>Browse listings</Link>
      ) : (
        <Link href="/my-listings" className="btn" style={{ marginTop: 16 }}>My Listings</Link>
      )}
    </div>
  );
}

export default function Purchases() {
  const { user } = useAuth();
  const [tab, setTab] = useState('bought'); // 'bought' | 'sold'
  const [bought, setBought] = useState(null);
  const [sold, setSold] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    // Load both in parallel
    api('/listings/purchases/all')
      .then((d) => setBought(d.items))
      .catch((e) => setError(e.message));
    api('/listings/sold/mine')
      .then((d) => setSold(d.items))
      .catch((e) => setError(e.message));
  }, [user]);

  if (!user) return null;

  const boughtCount = bought ? bought.length : 0;
  const soldCount = sold ? sold.length : 0;
  const currentItems = tab === 'bought' ? bought : sold;

  return (
    <div className="deals-page">
      {/* Header */}
      <div className="deals-header">
        <div>
          <h1 className="deals-heading">Closed Deals</h1>
          <p className="deals-subheading">Your complete transaction history on CampusKart</p>
        </div>
        <div className="deals-stats">
          <div className="deals-stat">
            <span className="deals-stat-num">{boughtCount}</span>
            <span className="deals-stat-label">Purchased</span>
          </div>
          <div className="deals-stat-divider" />
          <div className="deals-stat">
            <span className="deals-stat-num">{soldCount}</span>
            <span className="deals-stat-label">Sold</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="deals-tabs">
        <button
          className={`deals-tab ${tab === 'bought' ? 'active' : ''}`}
          onClick={() => setTab('bought')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Items I Bought
          {boughtCount > 0 && <span className="deals-tab-badge">{boughtCount}</span>}
        </button>
        <button
          className={`deals-tab ${tab === 'sold' ? 'active' : ''}`}
          onClick={() => setTab('sold')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Items I Sold
          {soldCount > 0 && <span className="deals-tab-badge">{soldCount}</span>}
        </button>
      </div>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Content */}
      {currentItems === null ? (
        <div className="deals-loading">
          <div className="deals-spinner" />
          Loading...
        </div>
      ) : currentItems.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="deals-grid">
          {currentItems.map((item) => (
            <DealCard key={item.id} item={item} role={tab === 'bought' ? 'buyer' : 'seller'} />
          ))}
        </div>
      )}
    </div>
  );
}
