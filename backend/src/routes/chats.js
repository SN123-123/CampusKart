const router = require('express').Router();
const { db } = require('../config/mysql');
const { auth } = require('../middleware/auth');
const { Conversation, Message } = require('../models/Chat');
const Notification = require('../models/Notification');
const { wrap, httpError } = require('../utils/http');

router.use(auth);

async function getMyConversation(id, userId) {
  if (!/^[a-f0-9]{24}$/i.test(String(id))) throw httpError(404, 'Conversation not found');
  const conv = await Conversation.findById(id);
  if (!conv || (conv.buyerId !== userId && conv.sellerId !== userId))
    throw httpError(404, 'Conversation not found');
  return conv;
}

// Start (or reopen) a chat with a seller about a listing
router.post(
  '/start',
  wrap(async (req, res) => {
    const listingId = Number(req.body.listingId);
    const [rows] = await db().query(
      `SELECT l.id, l.title, l.seller_id, l.status, u.name AS seller_name
       FROM listings l JOIN users u ON u.id = l.seller_id WHERE l.id = ?`,
      [listingId]
    );
    if (!rows.length || rows[0].status !== 'approved') throw httpError(404, 'Listing not available');
    const l = rows[0];
    if (l.seller_id === req.user.id) throw httpError(400, 'This is your own listing');

    let conv = await Conversation.findOne({ listingId, buyerId: req.user.id });
    if (!conv) {
      conv = await Conversation.create({
        listingId,
        listingTitle: l.title,
        buyerId: req.user.id,
        buyerName: req.user.name,
        sellerId: l.seller_id,
        sellerName: l.seller_name,
      });
    }
    res.json({ id: conv._id });
  })
);

// My conversations
router.get(
  '/',
  wrap(async (req, res) => {
    const me = req.user.id;
    const convs = await Conversation.find({ $or: [{ buyerId: me }, { sellerId: me }] })
      .sort({ lastMessageAt: -1 })
      .limit(100);
    res.json({
      conversations: convs.map((c) => {
        const iAmBuyer = c.buyerId === me;
        return {
          id: c._id,
          listingId: c.listingId,
          listingTitle: c.listingTitle,
          otherName: iAmBuyer ? c.sellerName : c.buyerName,
          role: iAmBuyer ? 'buying' : 'selling',
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unread: iAmBuyer ? c.unreadBuyer : c.unreadSeller,
        };
      }),
    });
  })
);

// Messages in one conversation (also marks them read for me)
router.get(
  '/:id/messages',
  wrap(async (req, res) => {
    const conv = await getMyConversation(req.params.id, req.user.id);
    const field = conv.buyerId === req.user.id ? 'unreadBuyer' : 'unreadSeller';
    if (conv[field] > 0) await Conversation.updateOne({ _id: conv._id }, { [field]: 0 });
    const messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: 1 }).limit(300);
    res.json({
      messages: messages.map((m) => ({ id: m._id, senderId: m.senderId, text: m.text, createdAt: m.createdAt })),
    });
  })
);

// Send a message
router.post(
  '/:id/messages',
  wrap(async (req, res) => {
    const conv = await getMyConversation(req.params.id, req.user.id);
    const text = String(req.body.text || '').trim();
    if (!text) throw httpError(400, 'Message is empty');
    if (text.length > 1000) throw httpError(400, 'Message is too long (max 1000 characters)');

    const msg = await Message.create({ conversationId: conv._id, senderId: req.user.id, text });
    const iAmBuyer = conv.buyerId === req.user.id;
    const otherId = iAmBuyer ? conv.sellerId : conv.buyerId;
    await Conversation.updateOne(
      { _id: conv._id },
      {
        lastMessage: text.slice(0, 120),
        lastMessageAt: new Date(),
        $inc: { [iAmBuyer ? 'unreadSeller' : 'unreadBuyer']: 1 },
      }
    );

    // One unread notification per conversation is enough
    const already = await Notification.findOne({ userId: otherId, type: 'message', ref: String(conv._id), read: false });
    if (!already) {
      await Notification.create({
        userId: otherId,
        type: 'message',
        text: `${req.user.name} sent you a message about "${conv.listingTitle}"`,
        link: `/chats?c=${conv._id}`,
        ref: String(conv._id),
      });
    }
    res.status(201).json({ id: msg._id });
  })
);

module.exports = router;
