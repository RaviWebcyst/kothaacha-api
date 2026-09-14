const mongoose = require('mongoose');

// A broker/agent/partner who helps guests find or manage properties —
// distinct from the AffiliateReview.affiliateName targets used on the
// Services page (photographers, chefs, etc.). Rating/review count are
// never stored here — they're always computed live from real, approved
// AffiliateReview rows matched by `name` (see publicController.js), same
// pattern as Property's rating being computed from Review.
const affiliateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Set by the public "Become an Affiliate" application form — not shown
    // on the public profile, only in the admin console while reviewing an
    // application (admin-created affiliates can leave these blank).
    email: { type: String, trim: true, lowercase: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    avatar: { type: String, trim: true, default: '' },
    role: { type: String, trim: true, default: 'Affiliate' },
    area: { type: String, trim: true, default: '' },
    specialty: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    areasServed: { type: [String], default: [] },
    categoriesServed: { type: [String], default: [] },
    servicesOffered: { type: [String], default: [] },
    // Neither of these come from a real messaging/booking system yet —
    // admin-set placeholders until one exists, same honesty tradeoff as
    // Property's admin-set featured/verified flags.
    responseRate: { type: Number, min: 0, max: 100, default: 0 },
    completedTransactions: { type: Number, min: 0, default: 0 },
    // Property titles this affiliate manages — resolved against the real
    // Property collection at read time for the "Managed Listings" tab,
    // never a separate copy of image/price data that could drift.
    managedPropertyTitles: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    // 'pending' = a public application awaiting admin review (see
    // publicController.applyAffiliate) — not shown on the public site
    // until an admin approves it (status -> 'active'). Admin-created
    // affiliates skip straight to 'active'.
    status: { type: String, enum: ['pending', 'active', 'inactive', 'rejected'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Affiliate', affiliateSchema);
