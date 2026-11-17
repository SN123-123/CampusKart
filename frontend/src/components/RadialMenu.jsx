'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/format';

export default function RadialMenu() {
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'notifs' | 'profile' | null
  const [notifs, setNotifs] = useState({ unread: 0, items: [] });
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const router = useRouter();
  const { user, logout } = useAuth();

  // Load notifications if user is logged in
  useEffect(() => {
    if (!user) return;
    api('/notifications')
      .then((d) => setNotifs(d))
      .catch(() => {});
  }, [user]);

  // Load fresh notifications when opening the notification modal
  async function openNotifsModal() {
    setOpen(false);
    setActiveModal('notifs');
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const d = await api('/notifications');
      setNotifs(d);
      if (d.unread > 0) {
        await api('/notifications/read-all', { method: 'POST' });
        setNotifs((prev) => ({ ...prev, unread: 0 }));
      }
    } catch {}
    setLoadingNotifs(false);
  }

  // Handle clicking items in the radial arc
  function handleAction(item) {
    if (item.id === 'notifs') {
      openNotifsModal();
      return;
    }
    if (item.id === 'profile') {
      setOpen(false);
      setActiveModal('profile');
      return;
    }

    setOpen(false);
    if (!user && (item.path === '/sell' || item.path === '/my-listings' || item.path === '/purchases')) {
      router.push("/login?from=" + encodeURIComponent(item.path));
      return;
    }
    router.push(item.path);
  }

  // Close with Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (activeModal) setActiveModal(null);
        else if (open) setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, activeModal]);

  // Lock body scroll when radial menu or modal is open
  useEffect(() => {
    if (open || activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open, activeModal]);

  const items = [
    {
      id: 'create',
      label: 'CREATE LISTING',
      path: '/sell',
      angle: 162, // lower left
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    {
      id: 'notifs',
      label: 'NOTIFICATIONS',
      path: '/chats',
      angle: 126, // middle left
      badge: notifs.unread > 0 ? notifs.unread : null,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      id: 'profile',
      label: 'PROFILE',
      path: '/profile',
      angle: 90, // top center
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      ),
    },
    {
      id: 'my-listings',
      label: 'MY LISTINGS',
      path: '/my-listings',
      angle: 54, // middle right
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      id: 'closed',
      label: 'CLOSED DEALS',
      path: '/purchases',
      angle: 18, // lower right
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      ),
    },
  ];

  const radius = 155;

  return (
    <>
      {/* Background Dim Backdrop */}
      <div
        className={`radial-backdrop ${open || activeModal ? 'active' : ''}`}
        onClick={() => {
          setOpen(false);
          setActiveModal(null);
        }}
        aria-hidden="true"
      />

      {/* Radial Menu Floating Trigger & Fan-out Arc */}
      <div className="radial-menu-wrap">
        <div className={`radial-items ${open ? 'active' : ''}`}>
          {items.map((item, index) => {
            const rad = (item.angle * Math.PI) / 180;
            const x = Math.round(radius * Math.cos(rad));
            const y = Math.round(-radius * Math.sin(rad));

            return (
              <button
                key={item.id}
                type="button"
                className="radial-item-wrapper"
                onClick={() => handleAction(item)}
                style={{
                  transform: open ? `translate(${x}px, ${y}px)` : 'translate(0px, 0px)',
                  opacity: open ? 1 : 0,
                  transitionDelay: open ? `${index * 35}ms` : '0ms',
                }}
                aria-label={item.label}
              >
                <div className="radial-btn">
                  {item.icon}
                  {item.badge && <span className="radial-badge-dot">{item.badge}</span>}
                </div>
                <span className="radial-label">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center Trigger / Close Button */}
        <button
          type="button"
          className={`radial-trigger ${open ? 'open' : ''}`}
          onClick={() => {
            if (activeModal) setActiveModal(null);
            else setOpen(!open);
          }}
          aria-label={open ? 'Close quick menu' : 'Open quick menu'}
          title={open ? 'Close' : 'Quick Menu'}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
            </svg>
          )}
        </button>
      </div>

      {/* ====================================================================
          MODAL 1: NOTIFICATIONS FUNCTION
          ==================================================================== */}
      {activeModal === 'notifs' && (
        <div className="radial-modal" role="dialog" aria-modal="true" aria-labelledby="notif-modal-title">
          <div className="radial-modal-head">
            <div>
              <h2 id="notif-modal-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                🔔 Notifications
              </h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                Updates on your listings, messages & purchases
              </div>
            </div>
            <button
              type="button"
              className="radial-modal-close"
              onClick={() => setActiveModal(null)}
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>

          <div className="radial-modal-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
            {!user ? (
              <div style={{ textAlign: 'center', padding: '24px 10px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                  Log in to see your notifications
                </div>
                <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                  Sign in with your PES student email to track items and chats.
                </div>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setActiveModal(null);
                    router.push('/login');
                  }}
                >
                  Log In
                </button>
              </div>
            ) : loadingNotifs ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
                Loading updates...
              </div>
            ) : notifs.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 12px', color: '#64748b' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>No notifications yet</div>
                <div style={{ fontSize: 13 }}>
                  When someone messages you about an item or your listing is reviewed, you'll see it here!
                </div>
              </div>
            ) : (
              <div>
                {notifs.items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link}
                    className="radial-notif-row"
                    onClick={() => setActiveModal(null)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: n.read ? 500 : 700, color: '#0f172a' }}>
                        {n.text}
                      </div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                        {timeAgo(n.createdAt)}
                      </div>
                    </div>
                    {!n.read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {user && (
            <div className="radial-modal-foot">
              <Link
                href="/chats"
                className="btn small secondary"
                style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
                onClick={() => setActiveModal(null)}
              >
                Go to Direct Messages
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          MODAL 2: PROFILE FUNCTION
          ==================================================================== */}
      {activeModal === 'profile' && (
        <div className="radial-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
          <div className="radial-modal-head">
            <div>
              <h2 id="profile-modal-title" style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>
                👤 Student Profile
              </h2>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                PES University Verified Account
              </div>
            </div>
            <button
              type="button"
              className="radial-modal-close"
              onClick={() => setActiveModal(null)}
              aria-label="Close profile"
            >
              ✕
            </button>
          </div>

          <div className="radial-modal-body">
            {user ? (
              <div>
                {/* User Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #14213d 0%, #2563eb 100%)',
                      color: '#ffffff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 22,
                      fontWeight: 800,
                    }}
                  >
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#0f172a' }}>
                      {user.name}
                    </div>
                    <div style={{ color: '#047857', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ✓ Verified Student
                    </div>
                  </div>
                </div>

                {/* Profile Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">SRN:</span>
                    <strong style={{ color: '#0f172a' }}>{user.srn || 'N/A'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">College Email:</span>
                    <strong style={{ color: '#0f172a' }}>{user.email}</strong>
                  </div>
                  {user.branch && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Branch / Batch:</span>
                      <strong style={{ color: '#0f172a' }}>{user.branch.toUpperCase()} {user.admission_year ? `('${user.admission_year})` : ''}</strong>
                    </div>
                  )}
                  {user.mobile && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="muted">Phone:</span>
                      <strong style={{ color: '#0f172a' }}>{user.mobile}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="muted">Role:</span>
                    <strong style={{ color: user.role === 'admin' ? '#d97706' : '#2563eb' }}>
                      {user.role === 'admin' ? '🛡️ Administrator' : 'Student'}
                    </strong>
                  </div>
                </div>

                {/* Quick Shortcuts */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/my-listings');
                    }}
                  >
                    📦 My Listings
                  </button>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/purchases');
                    }}
                  >
                    🛍️ Purchases
                  </button>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/wishlist');
                    }}
                  >
                    ♥ Wishlist
                  </button>
                  <button
                    type="button"
                    className="btn small secondary"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/chats');
                    }}
                  >
                    💬 Direct Chats
                  </button>
                </div>

                {user.role === 'admin' && (
                  <button
                    type="button"
                    className="btn small"
                    style={{ width: '100%', marginTop: 10, background: '#14213d', color: '#fbbf24' }}
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/admin');
                    }}
                  >
                    🛡️ Open Admin Moderation Panel
                  </button>
                )}

                <button
                  type="button"
                  className="btn small danger"
                  style={{ width: '100%', marginTop: 14 }}
                  onClick={() => {
                    setActiveModal(null);
                    logout();
                  }}
                >
                  Log out of CampusKart
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎓</div>
                <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>
                  Not Logged In
                </div>
                <p className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
                  Log in or register with your PES University email to access your profile, sell items, and chat with buyers.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn small primary"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/login');
                    }}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      setActiveModal(null);
                      router.push('/register');
                    }}
                  >
                    Register
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
