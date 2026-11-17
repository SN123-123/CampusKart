const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    type: { type: String, enum: ['message', 'listing_approved', 'listing_rejected', 'item_sold'], required: true },
    text: { type: String, required: true },
    link: { type: String, default: '/' },
    ref: { type: String, default: '' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
