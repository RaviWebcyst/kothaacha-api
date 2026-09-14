const mongoose = require('mongoose');

// Local add-on services (photography, chefs, massage, etc.) bookable
// alongside a stay. No rating/review data exists for services yet (unlike
// Property, which has a real Review collection) — deliberately not
// fabricating star ratings here; the public Services/ServiceDetails pages
// simply don't show a rating until a real service-review system exists.
const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true, trim: true },
    provider: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: 'session' },
    duration: { type: String, trim: true, default: '' },
    includes: { type: [String], default: [] },
    description: { type: String, trim: true, default: '' },
    featured: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
