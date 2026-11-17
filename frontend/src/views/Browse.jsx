'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ListingCard from '@/components/ListingCard';

const CATEGORY_ICONS = {
  Books: '📚',
  Electronics: '💻',
  Furniture: '🪑',
  'Cycles & Vehicles': '🚲',
  Clothing: '👕',
  'Lab Equipment': '🔬',
  Stationery: '✏️',
  Others: '📦',
};

export default function Browse() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ items: [], total: 0, page: 1, pages: 1 });
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/categories')
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page, sort });
        if (q) params.set('q', q);
        if (category) params.set('category', category);
        const res = await api('/listings?' + params.toString());
        setData(res);
      } catch (e) {
        setError(e.message);
      }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, sort, page]);

  return (
    <div>
      {/* Real Website Hero Section */}
      <div className="hero-box">
        <div className="hero-badge">
          🎓 PES University Student Marketplace
        </div>
        <h1 className="hero-title">
          Buy & Sell Inside <span style={{ color: 'var(--gold)' }}>Campus</span>
        </h1>
        <p className="hero-subtitle">
          The trusted peer-to-peer student marketplace for PES students. Buy and sell textbooks, electronics, cycles, lab gear, and hostel essentials directly.
        </p>

        {!user ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/register" className="btn">
              Register with PES Email
            </Link>
            <Link href="/login" className="btn secondary">
              Student Log in
            </Link>
            <Link href="/sell" className="btn secondary">
              + Post an Item
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/sell" className="btn">
              + Sell Something Today
            </Link>
            <Link href="/my-listings" className="btn secondary">
              Manage My Listings
            </Link>
          </div>
        )}
      </div>

      {/* Category Pills Bar (Real e-commerce experience) */}
      <div className="category-bar">
        <button
          className={`cat-pill ${category === '' ? 'active' : ''}`}
          onClick={() => {
            setCategory('');
            setPage(1);
          }}
        >
          🏷️ All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={`cat-pill ${category === String(c.id) ? 'active' : ''}`}
            onClick={() => {
              setCategory(category === String(c.id) ? '' : String(c.id));
              setPage(1);
            }}
          >
            {CATEGORY_ICONS[c.name] || '📦'} {c.name}
          </button>
        ))}
      </div>

      {/* Search & Filter Controls */}
      <div className="filters">
        <input
          placeholder="Search by keywords (e.g. cycle, DBMS textbook, calculator)..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          <option value="new">Newest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
        <span className="muted" style={{ alignSelf: 'center', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
          {data.total} {data.total === 1 ? 'item' : 'items'}
        </span>
      </div>

      {error && <div className="error">{error}</div>}
      
      {!loading && data.items.length === 0 && !error && (
        <div className="empty">
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#f8fafc', marginBottom: 6 }}>
            No listings found
          </div>
          <div className="muted" style={{ marginBottom: 18 }}>
            Try searching for something else or clearing your category filters.
          </div>
          <button
            className="btn small secondary"
            onClick={() => {
              setQ('');
              setCategory('');
              setPage(1);
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      <div className="grid">
        {data.items.map((item) => (
          <ListingCard key={item.id} item={item} />
        ))}
      </div>

      {data.pages > 1 && (
        <div className="pager">
          <button className="btn secondary small" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span className="muted" style={{ fontWeight: 600 }}>
            Page {data.page} of {data.pages}
          </span>
          <button className="btn secondary small" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
