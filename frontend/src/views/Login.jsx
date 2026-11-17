'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Only allow internal paths (blocks things like //evil.com)
  const rawFrom = params.get('from') || '/';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/';

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const mail = email.trim().toLowerCase();
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email: mail, password } });
      setUser(d.user);
      router.replace(from);
    } catch (err) {
      if (err.code === 'NOT_VERIFIED') {
        // Registered but never confirmed the email: send a fresh code and go verify
        sessionStorage.setItem('ck_pending_email', mail);
        try {
          await api('/auth/resend-otp', { method: 'POST', body: { email: mail } });
        } catch { }
        router.push('/verify');
        return;
      }
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <div className="ticket-head">
        <h1>Welcome back</h1>
        <div className="muted">Log in with your PES email and password</div>
      </div>
      <form className="ticket-body" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>College email</label>
          <input type="email" placeholder="pes1ug24cs693@stu.pes.edu" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          New here? <Link href="/register" style={{ color: 'var(--gold)', fontWeight: 700 }}>Register with your college email</Link>
        </p>
      </form>
    </div>
  );
}
