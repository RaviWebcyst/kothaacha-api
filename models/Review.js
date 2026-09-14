const mongoose = require('mongoose');

// Property reviews queued for admin moderation. `propertyTitle` is a
// denormalized snapshot, same lightweight pattern used across this admin
// panel (Report.targetName, Booking.propertyTitle) — no ref/populate needed.
//
// Per the spec's "no completed transaction/stay = no verified review"
// rule: `bookingId` links a review to the exact completed Booking that
// earned it. Reviews created that way get `verified: true` set once and
// never editable afterward — that's the whole fraud-prevention point.
// Admin-seeded/legacy reviews may have no bookingId (verified stays false).
const reviewSchema = new mongoose.Schema(
  {
    propertyTitle: { type: String, required: true, trim: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    reviewerName: { type: String, required: true, trim: true },
    reviewerEmail: { type: String, required: true, trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    photos: { type: [String], default: [] },
    // Category sub-scores from the spec (section 3) — each 1-5, optional
    // since older/admin-seeded reviews won't have them.
    categories: {
      cleanliness: { type: Number, min: 1, max: 5 },
      location: { type: Number, min: 1, max: 5 },
      accuracy: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      checkInOut: { type: Number, min: 1, max: 5 },
      amenities: { type: Number, min: 1, max: 5 },
      valueForMoney: { type: Number, min: 1, max: 5 },
      safety: { type: Number, min: 1, max: 5 },
    },
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
