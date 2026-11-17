const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../config/mysql');
const { auth, optionalAuth } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');
const { wrap, httpError } = require('../utils/http');
const { Conversation } = require('../models/Chat');
const Notification = require('../models/Notification');
const { sendItemSoldEmail } = require('../utils/email');

const CONDITIONS = ['new', 'like_new', 'good', 'fair'];

const CARD_SELECT = `
  l.id, l.title, l.price, l.item_condition, l.status, l.reject_reason, l.created_at,
  c.name AS category, u.name AS seller_name,
  (SELECT image_path FROM listing_images i WHERE i.listing_id = l.id ORDER BY image_no LIMIT 1) AS image`;

function removeFiles(paths) {
  for (const p of paths) {
    fs.unlink(path.join(uploadDir, path.basename(p)), () => {});
  }
}

// Browse approved listings (search, filter, sort, pages) - Publicly viewable
router.get(
  '/',
  optionalAuth,
  wrap(async (req, res) => {
    const { q, category, minPrice, maxPrice, sort } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = 12;

    const where = ["l.status = 'approved'"];
    const params = [];
    if (q) {
      where.push('(l.title LIKE ? OR l.description LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }
    if (category) {
      where.push('l.category_id = ?');
      params.push(Number(category));
    }
    if (minPrice) {
      where.push('l.price >= ?');
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      where.push('l.price <= ?');
      params.push(Number(maxPrice));
    }
    const order =
      sort === 'price_asc' ? 'l.price ASC' : sort === 'price_desc' ? 'l.price DESC' : 'l.created_at DESC';
    const from = `FROM listings l
      JOIN users u ON u.id = l.seller_id
      JOIN categories c ON c.id = l.category_id
      WHERE ${where.join(' AND ')}`;

    const [[{ total }]] = await db().query(`SELECT COUNT(*) AS total ${from}`, params);
    const [items] = await db().query(
      `SELECT ${CARD_SELECT} ${from} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, limit, (page - 1) * limit]
    );
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  })
);

// My own listings (any status)
router.get(
  '/mine',
  auth,
  wrap(async (req, res) => {
    const [items] = await db().query(
      `SELECT ${CARD_SELECT}
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       WHERE l.seller_id = ? ORDER BY l.created_at DESC`,
      [req.user.id]
    );
    res.json({ items });
  })
);

// My wishlist
router.get(
  '/wishlist/all',
  auth,
  wrap(async (req, res) => {
    const [items] = await db().query(
      `SELECT ${CARD_SELECT}
       FROM wishlist w
       JOIN listings l ON l.id = w.listing_id
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       WHERE w.user_id = ? AND l.status = 'approved'
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({ items });
  })
);

// Things I bought (listings the seller marked as sold to me)
router.get(
  '/purchases/all',
  auth,
  wrap(async (req, res) => {
    const [items] = await db().query(
      `SELECT ${CARD_SELECT}, l.sold_at
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       WHERE l.buyer_id = ? ORDER BY l.sold_at DESC`,
      [req.user.id]
    );
    res.json({ items });
  })
);

// Things I sold (my listings that are now marked as sold)
router.get(
  '/sold/mine',
  auth,
  wrap(async (req, res) => {
    const [items] = await db().query(
      `SELECT ${CARD_SELECT}, l.sold_at,
              b.name AS buyer_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       LEFT JOIN users b ON b.id = l.buyer_id
       WHERE l.seller_id = ? AND l.status = 'sold'
       ORDER BY l.sold_at DESC`,
      [req.user.id]
    );
    res.json({ items });
  })
);

// One listing - Publicly viewable if approved
router.get(
  '/:id',
  optionalAuth,
  wrap(async (req, res) => {
    const [rows] = await db().query(
      `SELECT l.*, c.name AS category, u.name AS seller_name, u.branch AS seller_branch,
              u.mobile AS seller_mobile, b.name AS buyer_name
       FROM listings l
       JOIN users u ON u.id = l.seller_id
       JOIN categories c ON c.id = l.category_id
       LEFT JOIN users b ON b.id = l.buyer_id
       WHERE l.id = ?`,
      [Number(req.params.id)]
    );
    if (!rows.length) throw httpError(404, 'Listing not found');
    const l = rows[0];
    const isOwner = req.user ? l.seller_id === req.user.id : false;
    const isBuyer = req.user ? l.buyer_id === req.user.id : false;
    const isAdmin = Boolean(req.user && req.user.role === 'admin');

    if (l.status !== 'approved' && !isOwner && !isBuyer && !isAdmin)
      throw httpError(404, 'Listing not found');
    if (!isOwner && !isBuyer && !isAdmin) l.buyer_name = null;
    delete l.buyer_id;
    delete l.reviewed_by;

    // The seller's mobile number is private: only students who showed interest
    // (started a chat about this listing) can see it, plus the seller and admins.
    // Chats live in MongoDB, so "interested" is checked there.
    const interested = req.user && !isOwner && (await Conversation.exists({ listingId: l.id, buyerId: req.user.id }));
    const canSeeMobile = isOwner || isAdmin || !!interested;
    if (!canSeeMobile) l.seller_mobile = null;

    const [images] = await db().query(
      'SELECT image_path FROM listing_images WHERE listing_id = ? ORDER BY image_no',
      [l.id]
    );
    let wished = false;
    if (req.user) {
      const [wish] = await db().query('SELECT 1 FROM wishlist WHERE user_id = ? AND listing_id = ?', [
        req.user.id,
        l.id,
      ]);
      wished = wish.length > 0;
    }
    res.json({
      ...l,
      images: images.map((i) => i.image_path),
      can_see_mobile: canSeeMobile,
      wished,
      is_owner: isOwner,
      is_buyer: isBuyer,
    });
  })
);

// Post a new listing (goes to admin for approval first)
router.post(
  '/',
  auth,
  upload.array('images', 4),
  wrap(async (req, res) => {
    const files = (req.files || []).map((f) => `/uploads/${f.filename}`);
    try {
      const title = String(req.body.title || '').trim();
      const description = String(req.body.description || '').trim();
      const price = Number(req.body.price);
      const categoryId = Number(req.body.category_id);
      const condition = req.body.item_condition;

      if (title.length < 3 || title.length > 150) throw httpError(400, 'Title must be 3 to 150 characters');
      if (description.length < 10) throw httpError(400, 'Please add a short description (at least 10 characters)');
      if (!Number.isFinite(price) || price < 0 || price > 10000000) throw httpError(400, 'Enter a valid price');
      if (!CONDITIONS.includes(condition)) throw httpError(400, 'Choose the item condition');
      const [cat] = await db().query('SELECT id FROM categories WHERE id = ?', [categoryId]);
      if (!cat.length) throw httpError(400, 'Choose a category');
      if (!files.length) throw httpError(400, 'Add at least one photo');

      const [r] = await db().query(
        'INSERT INTO listings (seller_id, category_id, title, description, price, item_condition) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, categoryId, title, description, price, condition]
      );
      for (let i = 0; i < files.length; i++) {
        await db().query('INSERT INTO listing_images (listing_id, image_no, image_path) VALUES (?, ?, ?)', [
          r.insertId,
          i + 1,
          files[i],
        ]);
      }
      res.status(201).json({ id: r.insertId, status: 'pending' });
    } catch (e) {
      removeFiles(files);
      throw e;
    }
  })
);

// People who chatted with me about this listing (candidates for "who bought it")
router.get(
  '/:id/buyers',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db().query('SELECT seller_id FROM listings WHERE id = ?', [id]);
    if (!rows.length || rows[0].seller_id !== req.user.id) throw httpError(404, 'Listing not found');
    const convs = await Conversation.find({ listingId: id }).sort({ lastMessageAt: -1 });
    res.json({ buyers: convs.map((c) => ({ id: c.buyerId, name: c.buyerName })) });
  })
);

// Mark my listing as sold, optionally to one of the students who chatted with me
router.patch(
  '/:id/sold',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db().query('SELECT title, seller_id, status FROM listings WHERE id = ?', [id]);
    if (!rows.length || rows[0].seller_id !== req.user.id || rows[0].status !== 'approved')
      throw httpError(400, 'Only your approved listings can be marked as sold');

    let buyerId = null;
    if (req.body && req.body.buyer_id) {
      buyerId = Number(req.body.buyer_id);
      const chatted = await Conversation.exists({ listingId: id, buyerId });
      if (!chatted) throw httpError(400, 'That student has not chatted with you about this item');
    }
    await db().query(
      "UPDATE listings SET status = 'sold', buyer_id = ?, sold_at = NOW() WHERE id = ?",
      [buyerId, id]
    );
    if (buyerId) {
      await Notification.create({
        userId: buyerId,
        type: 'item_sold',
        text: `${req.user.name} marked "${rows[0].title}" as sold to you`,
        link: '/purchases',
      });
      const [buyerRows] = await db().query('SELECT email, name FROM users WHERE id = ?', [buyerId]);
      if (buyerRows.length) {
        sendItemSoldEmail(buyerRows[0].email, {
          buyerName: buyerRows[0].name,
          sellerName: req.user.name,
          title: rows[0].title,
          listingId: id,
        }).catch((err) => console.error('Failed to send item sold email:', err.message));
      }
    }
    res.json({ ok: true });
  })
);

// Delete (owner or admin)
router.delete(
  '/:id',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db().query('SELECT seller_id FROM listings WHERE id = ?', [id]);
    if (!rows.length) throw httpError(404, 'Listing not found');
    if (rows[0].seller_id !== req.user.id && req.user.role !== 'admin') throw httpError(403, 'Not allowed');
    const [imgs] = await db().query('SELECT image_path FROM listing_images WHERE listing_id = ?', [id]);
    await db().query('DELETE FROM listings WHERE id = ?', [id]);
    removeFiles(imgs.map((i) => i.image_path));
    res.json({ ok: true });
  })
);

// Add / remove from wishlist
router.post(
  '/:id/wishlist',
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [exists] = await db().query('SELECT 1 FROM wishlist WHERE user_id = ? AND listing_id = ?', [req.user.id, id]);
    if (exists.length) {
      await db().query('DELETE FROM wishlist WHERE user_id = ? AND listing_id = ?', [req.user.id, id]);
      return res.json({ wished: false });
    }
    const [l] = await db().query("SELECT id FROM listings WHERE id = ? AND status = 'approved'", [id]);
    if (!l.length) throw httpError(404, 'Listing not found');
    await db().query('INSERT INTO wishlist (user_id, listing_id) VALUES (?, ?)', [req.user.id, id]);
    res.json({ wished: true });
  })
);

module.exports = router;
