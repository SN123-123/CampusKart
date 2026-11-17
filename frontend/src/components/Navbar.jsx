'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [notifs, setNotifs] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let stop = false;
    async function load() {
      try {
        const d = await api('/notifications');
        if (!stop) setNotifs(d);
      } catch {}
    }
    load();
    const t = setInterval(load, 20000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [user]);

  async function toggleBell() {
    const next = !open;
    setOpen(next);
    if (next && notifs.unread > 0) {
      try {
        await api('/notifications/read-all', { method: 'POST' });
        setNotifs((n) => ({ ...n, unread: 0 }));
      } catch {}
    }
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="logo">
          Campus<span>Kart</span>
        </Link>
        {user ? (
          <>
            <Link href="/" className="link">Browse</Link>
            <Link href="/my-listings" className="link">My Listings</Link>
            <Link href="/wishlist" className="link">Wishlist</Link>
            <Link href="/purchases" className="link">Purchases</Link>
            <Link href="/chats" className="link">Chats</Link>
            {user.role === 'admin' && (
              <Link href="/admin" className="link" style={{ color: 'var(--gold)' }}>
                🛡️ Admin
              </Link>
            )}
            <div className="spacer" />
            <Link href="/sell" className="btn small">
              + Sell Item
            </Link>
            <div style={{ position: 'relative' }}>
              <button className="bell" onClick={toggleBell} aria-label="Notifications">
                🔔
                {notifs.unread > 0 && <span className="badge-dot">{notifs.unread}</span>}
              </button>
              {open && (
                <div className="notif-panel">
                  {notifs.items.length === 0 && <div className="notif-item muted">No notifications yet</div>}
                  {notifs.items.map((n) => (
                    <Link
                      key={n.id}
                      href={n.link}
                      className={'notif-item' + (n.read ? '' : ' unread')}
                      onClick={() => setOpen(false)}
                    >
                      {n.text}
                      <div className="muted" style={{ fontSize: 12 }}>{timeAgo(n.createdAt)}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '5px 12px',
              borderRadius: 9999,
              color: '#e2e8f0',
              fontWeight: 600,
            }}>
              👤 {user.srn || user.name}
            </span>
            <button className="btn small secondary" onClick={logout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/" className="link">Browse</Link>
            <Link href="/sell" className="link">Sell</Link>
            <div className="spacer" />
            <Link href="/login" className="link">Log in</Link>
            <Link href="/register" className="btn small">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
