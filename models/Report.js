const mongoose = require('mongoose');

// User-submitted reports flagging a listing, a review, or an account —
// shown in the admin console's Reports tab.
const reportSchema = new mongoose.Schema(
  {
    reporterName: { type: String, required: true, trim: true },
    reporterEmail: { type: String, required: true, trim: true, lowercase: true },

    targetType: {
      type: String,
      enum: ['property', 'review', 'account'],
      required: true,
    },
    targetName: { type: String, required: true, trim: true }, // title/name of the reported listing, review, or account

    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },

    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
