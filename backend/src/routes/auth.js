const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../config/mysql');
const { auth } = require('../middleware/auth');
const { wrap, httpError } = require('../utils/http');
const { isCollegeEmail, parseCollegeEmail } = require('../utils/college');
const { sendOtpEmail } = require('../utils/email');

const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  srn: u.srn,
  mobile: u.mobile,
  name: u.name,
  role: u.role,
  branch: u.branch,
  admission_year: u.admission_year,
});

function setLoginCookie(res, userId) {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('ck_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// Create a fresh 6-digit code, store it hashed, and email it
async function issueOtp(email) {
  const [recent] = await db().query(
    'SELECT id FROM email_otps WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)',
    [email]
  );
  if (recent.length) throw httpError(429, 'Please wait a minute before asking for another code');

  const otp = String(crypto.randomInt(100000, 1000000));
  const hash = await bcrypt.hash(otp, 8);
  await db().query('DELETE FROM email_otps WHERE email = ?', [email]);
  await db().query(
    'INSERT INTO email_otps (email, otp_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
    [email, hash]
  );
  await sendOtpEmail(email, otp);
}

// 1) Register with the college email + a password you choose
router.post(
  '/register',
  wrap(async (req, res) => {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const mobile = String(req.body.mobile || '').trim();

    if (name.length < 2) throw httpError(400, 'Please enter your name');
    if (!isCollegeEmail(email))
      throw httpError(400, 'Use your PES student email, like pes1ug24cs693@stu.pes.edu');
    if (!/^[6-9]\d{9}$/.test(mobile)) throw httpError(400, 'Enter a valid 10-digit mobile number');
    if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');

    const hash = await bcrypt.hash(password, 10);
    const [rows] = await db().query('SELECT id, is_verified FROM users WHERE email = ?', [email]);

    if (rows.length) {
      if (rows[0].is_verified) throw httpError(409, 'This email is already registered. Please log in.');
      // Registered earlier but never verified: let them retry with new details
      await db().query('UPDATE users SET name = ?, password_hash = ?, mobile = ? WHERE id = ?', [name, hash, mobile, rows[0].id]);
    } else {
      const info = parseCollegeEmail(email);
      await db().query(
        'INSERT INTO users (email, srn, mobile, name, password_hash, branch, admission_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [email, info.srn, mobile, name, hash, info.branch, info.admission_year]
      );
    }

    await issueOtp(email);
    res.status(201).json({ message: `Verification code sent to ${email}` });
  })
);

// 2) Enter the code from your email: this proves the mailbox is yours
router.post(
  '/verify-otp',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();

    const [rows] = await db().query(
      'SELECT *, (expires_at < NOW()) AS expired FROM email_otps WHERE email = ? ORDER BY id DESC LIMIT 1',
      [email]
    );
    if (!rows.length) throw httpError(400, 'No code found. Please request a new one.');
    const row = rows[0];
    if (row.expired) throw httpError(400, 'This code has expired. Please request a new one.');
    if (row.attempts >= 5) throw httpError(429, 'Too many wrong attempts. Please request a new code.');

    await db().query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?', [row.id]);
    if (!(await bcrypt.compare(otp, row.otp_hash))) throw httpError(400, 'Incorrect code');

    await db().query('UPDATE users SET is_verified = 1 WHERE email = ?', [email]);
    await db().query('DELETE FROM email_otps WHERE email = ?', [email]);

    const [users] = await db().query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) throw httpError(400, 'Account not found');
    setLoginCookie(res, users[0].id);
    res.json({ user: publicUser(users[0]) });
  })
);

router.post(
  '/resend-otp',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const [rows] = await db().query('SELECT is_verified FROM users WHERE email = ?', [email]);
    if (!rows.length) throw httpError(404, 'No registration found for this email');
    if (rows[0].is_verified) throw httpError(400, 'This email is already verified. Please log in.');
    await issueOtp(email);
    res.json({ message: `New code sent to ${email}` });
  })
);

// 3) Every later visit: log in with the same email + password
router.post(
  '/login',
  wrap(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const [rows] = await db().query('SELECT * FROM users WHERE email = ?', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      throw httpError(401, 'Incorrect email or password');

    if (!user.is_verified)
      return res.status(403).json({ error: 'Please verify your email first', code: 'NOT_VERIFIED' });

    setLoginCookie(res, user.id);
    res.json({ user: publicUser(user) });
  })
);

router.post('/logout', (req, res) => {
  res.clearCookie('ck_token');
  res.json({ ok: true });
});

router.get('/me', auth, (req, res) => res.json({ user: req.user }));

module.exports = router;
