'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { EMAIL_RE } from '@/lib/format';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return setError('Use your PES student email, like pes1ug24cs693@stu.pes.edu');
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return setError('Enter a valid 10-digit mobile number');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    try {
      await api('/auth/register', { method: 'POST', body: { name: form.name, email, mobile: form.mobile.trim(), password: form.password } });
      sessionStorage.setItem('ck_pending_email', email);
      router.push('/verify');
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="auth-wrap">
      <div className="ticket-head">
        <h1>Join CampusKart</h1>
        <div className="muted">Only for PES University students</div>
      </div>
      <form className="ticket-body" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={set('name')} required />
        </div>
        <div className="field">
          <label>College email</label>
          <input type="email" placeholder="pes1ug24cs693@stu.pes.edu" value={form.email} onChange={set('email')} required />
          <span className="muted">We will send a 6-digit code to this email to confirm it is yours.</span>
        </div>
        <div className="field">
          <label>Mobile number</label>
          <input type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })} required />
          <span className="muted">Buyers only see this if they message you about an item.</span>
        </div>
        <div className="field">
          <label>Create a password</label>
          <input type="password" value={form.password} onChange={set('password')} required />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input type="password" value={form.confirm} onChange={set('confirm')} required />
        </div>
        <button className="btn" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Sending code...' : 'Register'}
        </button>
        <p className="muted" style={{ textAlign: 'center' }}>
          Already registered? <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 700 }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}
