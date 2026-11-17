require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const { initMySQL, db } = require('./config/mysql');
const { initMongo } = require('./config/mongo');
const { auth } = require('./middleware/auth');
const { wrap } = require('./utils/http');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin', require('./routes/admin'));

app.get(
  '/api/categories',
  wrap(async (req, res) => {
    const [rows] = await db().query('SELECT id, name FROM categories ORDER BY name');
    res.json({ categories: rows });
  })
);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Central error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 4 MB' : err.message;
    return res.status(400).json({ error: msg });
  }
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

async function start() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing. Copy .env.example to .env and fill it in.');
  await initMySQL();
  await initMongo();
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`CampusKart API running on http://localhost:${port}`);
    if (!process.env.SMTP_HOST) {
      console.log('✉ Mail System: Console Dev Mode (verification codes print to terminal)');
    } else {
      console.log(`✉ Mail System: SMTP configured (${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587})`);
    }
  });
}

start().catch((e) => {
  console.error('Failed to start:', e.message);
  process.exit(1);
});
