const router = require('express').Router();
const { db } = require('../config/mysql');
const { auth, adminOnly } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { wrap, httpError } = require('../utils/http');
const { sendListingStatusEmail } = require('../utils/email');

router.use(auth, adminOnly);

router.get(
  '/stats',
  wrap(async (req, res) => {
    const [[users]] = await db().query("SELECT COUNT(*) AS n FROM users WHERE is_verified = 1 AND role = 'student'");
    const [byStatus] = await db().query('SELECT status, COUNT(*) AS n FROM listings GROUP BY status');
    const stats = { students: users.n, pending: 0, approved: 0, rejected: 0, sold: 0 };
    byStatus.forEach((r) => (stats[r.status] = r.n));
    res.json(stats);
  })
);

// Listings waiting for approval
router.get(
  '/pending',
  wrap(async (req, res) => {
    const [items] = await db().query(
      `SELECT l.id, l.title, l.description, l.price, l.item_condition, l.created_at,
              c.name AS category, u.name AS seller_name, u.srn AS seller_srn
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       WHERE l.status = 'pending' ORDER BY l.created_at ASC`
    );
    if (items.length) {
      const [imgs] = await db().query(
        'SELECT listing_id, image_path FROM listing_images WHERE listing_id IN (?) ORDER BY image_no',
        [items.map((i) => i.id)]
      );
      items.forEach((i) => (i.images = imgs.filter((m) => m.listing_id === i.id).map((m) => m.image_path)));
    }
    res.json({ items });
  })
);

router.post(
  '/listings/:id/approve',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db().query(
      `SELECT l.seller_id, l.title, u.email, u.name AS seller_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       WHERE l.id = ? AND l.status = 'pending'`,
      [id]
    );
    if (!rows.length) throw httpError(404, 'Pending listing not found');
    await db().query(
      "UPDATE listings SET status = 'approved', reject_reason = NULL, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [req.user.id, id]
    );
    await Notification.create({
      userId: rows[0].seller_id,
      type: 'listing_approved',
      text: `Your listing "${rows[0].title}" is now live`,
      link: `/listings/${id}`,
    });
    sendListingStatusEmail(rows[0].email, {
      sellerName: rows[0].seller_name,
      title: rows[0].title,
      status: 'approved',
      listingId: id,
    }).catch((err) => console.error('Failed to send approval email:', err.message));
    res.json({ ok: true });
  })
);

router.post(
  '/listings/:id/reject',
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const reason = String(req.body.reason || '').trim().slice(0, 255) || 'Does not meet our guidelines';
    const [rows] = await db().query(
      `SELECT l.seller_id, l.title, u.email, u.name AS seller_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       WHERE l.id = ? AND l.status = 'pending'`,
      [id]
    );
    if (!rows.length) throw httpError(404, 'Pending listing not found');
    await db().query(
      "UPDATE listings SET status = 'rejected', reject_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [reason, req.user.id, id]
    );
    await Notification.create({
      userId: rows[0].seller_id,
      type: 'listing_rejected',
      text: `Your listing "${rows[0].title}" was rejected: ${reason}`,
      link: '/my-listings',
    });
    sendListingStatusEmail(rows[0].email, {
      sellerName: rows[0].seller_name,
      title: rows[0].title,
      status: 'rejected',
      reason,
      listingId: id,
    }).catch((err) => console.error('Failed to send rejection email:', err.message));
    res.json({ ok: true });
  })
);

module.exports = router;
