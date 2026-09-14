const mongoose = require('mongoose');

// Affiliate/broker/service-provider reviews queued for admin moderation.
// `affiliateName` is a denormalized snapshot — same lightweight pattern as
// Review.propertyTitle / Report.targetName — matched against Affiliate.name
// at read time rather than a hard ref, so this collection stays reusable
// for both real estate affiliates and Services-page providers.
const affiliateReviewSchema = new mongoose.Schema(
  {
    affiliateName: { type: String, required: true, trim: true },
    reviewerName: { type: String, required: true, trim: true },
    reviewerEmail: { type: String, required: true, trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: '' },
    // What the reviewer used the affiliate for (e.g. "Purchase negotiation",
    // "Property viewing") — shown as a tag on the public Reviews/affiliate
    // profile pages. Optional since older reviews (service-provider ones)
    // don't have this concept.
    service: { type: String, trim: true, default: '' },
    // Category sub-scores from the spec (section 4) — each 1-5, optional
    // since older reviews won't have them.
    categories: {
      communication: { type: Number, min: 1, max: 5 },
      responsiveness: { type: Number, min: 1, max: 5 },
      professionalism: { type: Number, min: 1, max: 5 },
      knowledge: { type: Number, min: 1, max: 5 },
      honesty: { type: Number, min: 1, max: 5 },
      propertyAssistance: { type: Number, min: 1, max: 5 },
    },
    // True only when the reviewer's email matches a completed Booking on
    // one of the affiliate's managed properties — set server-side at
    // submission time, never guest-editable (see publicController.js).
    verified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AffiliateReview', affiliateReviewSchema);
