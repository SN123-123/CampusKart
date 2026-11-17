'use client';

import Link from 'next/link';
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">
            Campus<span>Kart</span>
          </div>
          <p style={{ maxWidth: 360, lineHeight: 1.6, margin: '8px 0 16px', color: '#94a3b8' }}>
            The dedicated peer-to-peer marketplace built exclusively for PES University students. Buy, sell, and exchange textbooks, electronics, cycles, and lab essentials inside the campus safely.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 10px', borderRadius: 9999, border: '1px solid rgba(245, 158, 11, 0.25)' }}>
            🔒 PES College Email Verified Only
          </div>
        </div>

        <div>
          <h4>Marketplace</h4>
          <ul className="footer-links">
            <li><Link href="/">Browse All Items</Link></li>
            <li><Link href="/sell">Sell an Item</Link></li>
            <li><Link href="/wishlist">Saved Wishlist</Link></li>
            <li><Link href="/purchases">My Purchases</Link></li>
            <li><Link href="/chats">Direct Chats</Link></li>
          </ul>
        </div>

        <div>
          <h4>Safety & Trust</h4>
          <ul className="footer-links">
            <li><span style={{ color: '#94a3b8' }}>Meet at campus spots (Library, Cafeteria)</span></li>
            <li><span style={{ color: '#94a3b8' }}>Verify items in person before paying</span></li>
            <li><span style={{ color: '#94a3b8' }}>All listings moderated by Admins</span></li>
            <li><Link href="/login">Student Log in</Link></li>
            <li><Link href="/register">Register Account</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <div>© {new Date().getFullYear()} CampusKart • Built with React, MySQL & MongoDB.</div>
        <div style={{ color: '#7888a3' }}>PES University (RR Campus & EC Campus)</div>
      </div>
    </footer>
  );
}

