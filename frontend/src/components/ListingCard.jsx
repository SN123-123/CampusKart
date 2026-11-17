'use client';

import Link from 'next/link';
import { rupee, CONDITIONS, getCategoryClass } from '@/lib/format';

export default function ListingCard({ item, showStatus = false }) {
  return (
    <Link href={`/listings/${item.id}`} className="card">
      <div className="card-img">
        {item.image ? (
          <img src={item.image} alt={item.title} loading="lazy" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <span style={{ fontSize: 24 }}>📷</span>
            <span>No photo</span>
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 4, zIndex: 2 }}>
          <span className={`chip cond-${item.item_condition}`}>
            {CONDITIONS[item.item_condition]}
          </span>
        </div>
      </div>
      <div className="card-body">
        <div className="price">{rupee(item.price)}</div>
        <div className="card-title">{item.title}</div>
        <div className="row" style={{ gap: 6, marginBottom: 8 }}>
          <span className={`chip ${getCategoryClass(item.category)}`}>
            {item.category}
          </span>
          {showStatus && <span className={'chip ' + item.status}>{item.status}</span>}
        </div>
        <div
          className="muted"
          style={{
            marginTop: 'auto',
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 10,
            }}
          >
            {item.seller_name ? item.seller_name[0].toUpperCase() : 'U'}
          </span>
          <span style={{ color: '#94a3b8' }}>{item.seller_name}</span>
        </div>
      </div>
    </Link>
  );
}
