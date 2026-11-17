const mongoose = require('mongoose');

// One conversation per (listing, buyer). The seller is the listing owner.
const conversationSchema = new mongoose.Schema(
  {
    listingId: { type: Number, required: true },
    listingTitle: { type: String, required: true },
    buyerId: { type: Number, required: true },
    buyerName: { type: String, required: true },
    sellerId: { type: Number, required: true },
    sellerName: { type: String, required: true },
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
  },
  { timestamps: true }
);
conversationSchema.index({ listingId: 1, buyerId: 1 }, { unique: true });
conversationSchema.index({ buyerId: 1, lastMessageAt: -1 });
conversationSchema.index({ sellerId: 1, lastMessageAt: -1 });

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: Number, required: true },
    text: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

module.exports = {
  Conversation: mongoose.model('Conversation', conversationSchema),
  Message: mongoose.model('Message', messageSchema),
};
