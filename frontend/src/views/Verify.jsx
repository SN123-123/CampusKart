'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Verify() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    setEmail(sessionStorage.getItem('ck_pending_email') || '');
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api('/auth/verify-otp', { method: 'POST', body: { email, otp } });
      setUser(d.user);
      sessionStorage.removeItem('ck_pending_email');
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  async function resend() {
    setError('');
    setInfo('');
    try {
      const d = await api('/auth/resend-otp', { method: 'POST', body: { email } });
      setInfo(d.message);
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="ticket-head">
        <h1>Check your email</h1>
        <div className="muted">Enter the 6-digit code we sent to confirm your college email</div>
      </div>
      <form className="ticket-body" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        {info && <div className="success">{info}</div>}
        <div className="field">
          <label>College email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Verification code</label>
          <input
            className="otp-input"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="------"
            required
          />
        </div>
        <button className="btn" disabled={busy || otp.length !== 6} style={{ width: '100%' }}>
          {busy ? 'Checking...' : 'Verify and continue'}
        </button>
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <button type="button" className="btn secondary small" onClick={resend} disabled={cooldown > 0 || !email}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
          <Link href="/register" className="muted">Wrong email?</Link>
        </div>
      </form>
    </div>
  );
}
