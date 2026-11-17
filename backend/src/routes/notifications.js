const router = require('express').Router();
const { auth } = require('../middleware/auth');
const Notification = require('../models/Notification');
const { wrap } = require('../utils/http');

router.use(auth);

router.get(
  '/',
  wrap(async (req, res) => {
    const [items, unread] = await Promise.all([
      Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(20),
      Notification.countDocuments({ userId: req.user.id, read: false }),
    ]);
    res.json({
      unread,
      items: items.map((n) => ({ id: n._id, text: n.text, link: n.link, read: n.read, createdAt: n.createdAt })),
    });
  })
);

router.post(
  '/read-all',
  wrap(async (req, res) => {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ ok: true });
  })
);

module.exports = router;
