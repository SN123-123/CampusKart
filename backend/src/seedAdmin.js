// Creates (or resets) the admin account:  npm run seed:admin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initMySQL, db } = require('./config/mysql');

(async () => {
  const email = (process.env.ADMIN_EMAIL || 'admin@campuskart.local').toLowerCase();
  const name = process.env.ADMIN_NAME || 'CampusKart Admin';
  const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

  await initMySQL();
  const hash = await bcrypt.hash(password, 10);
  const [rows] = await db().query('SELECT id FROM users WHERE email = ?', [email]);
  if (rows.length) {
    await db().query("UPDATE users SET name = ?, password_hash = ?, role = 'admin', is_verified = 1 WHERE id = ?", [
      name,
      hash,
      rows[0].id,
    ]);
  } else {
    await db().query(
      "INSERT INTO users (email, name, password_hash, role, is_verified) VALUES (?, ?, ?, 'admin', 1)",
      [email, name, hash]
    );
  }
  console.log(`Admin ready. Log in with ${email} / ${password}`);
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
