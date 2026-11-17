const jwt = require('jsonwebtoken');
const { db } = require('../config/mysql');

async function auth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.ck_token;
    if (!token) return res.status(401).json({ error: 'Please log in' });
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db().query(
      'SELECT id, email, srn, mobile, name, role, branch, admission_year FROM users WHERE id = ? AND is_verified = 1',
      [id]
    );
    if (!rows.length) return res.status(401).json({ error: 'Account not found' });
    req.user = rows[0];
    next();
  } catch (e) {
    res.status(401).json({ error: 'Session expired, please log in again' });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.ck_token;
    if (!token) {
      req.user = null;
      return next();
    }
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await db().query(
      'SELECT id, email, srn, mobile, name, role, branch, admission_year FROM users WHERE id = ? AND is_verified = 1',
      [id]
    );
    req.user = rows.length ? rows[0] : null;
    next();
  } catch (e) {
    req.user = null;
    next();
  }
}

function adminOnly(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({ error: 'Admins only' });
}

module.exports = { auth, optionalAuth, adminOnly };
