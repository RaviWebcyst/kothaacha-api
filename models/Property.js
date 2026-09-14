const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    images: { type: [String], default: [] }, // uploaded photo paths (/uploads/...); images[0] is the cover shown in the table
    type: { type: String, required: true, trim: true }, // e.g. homestay, apartment, villa
    city: { type: String, required: true, trim: true },
    area: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 },
    bedrooms: { type: Number, min: 0, default: 0 },
    bathrooms: { type: Number, min: 0, default: 0 },
    guests: { type: Number, min: 0, default: 0 },
    // Stay lengths this listing can be booked for (daily/weekly/biweekly/
    // monthly/longterm/custom), each with its own price — `price` above
    // remains the base/per-night rate always shown on cards; these are the
    // "Pricing by duration" options shown on the detail page and used by
    // the Stay Duration sidebar filter (matched on `.key`).
    durations: {
      type: [{ _id: false, key: String, price: Number }],
      default: [],
    },
    amenities: { type: [String], default: [] },
    featured: { type: Boolean, default: false }, // shows a "Featured" badge on the public site
    verified: { type: Boolean, default: false }, // shows a "Verified" badge on the public site
    // Minimum/maximum stay length, in nights — 0 means "no limit set".
    minStay: { type: Number, min: 0, default: 0 },
    maxStay: { type: Number, min: 0, default: 0 },
    // Road access & nearby distances — free text so hosts can phrase them
    // naturally ("1.6 km", "Blacktopped access road", etc.).
    roadAccess: { type: String, trim: true, default: '' },
    roadWidth: { type: String, trim: true, default: '' },
    mainRoadDistance: { type: String, trim: true, default: '' },
    highwayDistance: { type: String, trim: true, default: '' },
    publicTransportation: { type: String, trim: true, default: '' },
    waterAvailability: { type: String, trim: true, default: '' },
    electricity: { type: String, trim: true, default: '' },
    internet: { type: String, trim: true, default: '' },
    drainageSewerage: { type: String, trim: true, default: '' },
    nearbyHospital: { type: String, trim: true, default: '' },
    nearbySchool: { type: String, trim: true, default: '' },
    nearbyMarket: { type: String, trim: true, default: '' },
    nearbyAirport: { type: String, trim: true, default: '' },
    nearbyAttractions: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Property', propertySchema);
