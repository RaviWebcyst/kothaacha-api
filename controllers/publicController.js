// controllers/publicController.js
// Read-only, unauthenticated endpoints that power the public site (the
// Properties/Property/Blog/BlogPost pages and the homepage grid) — only
// ever returns active properties / published blog posts, and only the
// fields a visitor should see (no internal status flags beyond what's
// needed to filter, no admin-only data).
const Property = require('../models/Property');
const Blog = require('../models/Blog');
const Review = require('../models/Review');
const Service = require('../models/Service');
const Affiliate = require('../models/Affiliate');
const AffiliateReview = require('../models/AffiliateReview');
const Booking = require('../models/Booking');
const mailer = require('../utils/mailer');

const shapeProperty = (p, ratingInfo) => ({
  id: p._id,
  title: p.title,
  images: p.images,
  type: p.type,
  city: p.city,
  area: p.area,
  price: p.price,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  guests: p.guests,
  durations: p.durations || [],
  amenities: p.amenities || [],
  featured: Boolean(p.featured),
  verified: Boolean(p.verified),
  minStay: p.minStay || 0,
  maxStay: p.maxStay || 0,
  roadAccess: p.roadAccess || '',
  roadWidth: p.roadWidth || '',
  mainRoadDistance: p.mainRoadDistance || '',
  highwayDistance: p.highwayDistance || '',
  publicTransportation: p.publicTransportation || '',
  waterAvailability: p.waterAvailability || '',
  electricity: p.electricity || '',
  internet: p.internet || '',
  drainageSewerage: p.drainageSewerage || '',
  nearbyHospital: p.nearbyHospital || '',
  nearbySchool: p.nearbySchool || '',
  nearbyMarket: p.nearbyMarket || '',
  nearbyAirport: p.nearbyAirport || '',
  nearbyAttractions: p.nearbyAttractions || '',
  // Real aggregate from approved reviews only — 0/null when a listing has
  // none yet, never a fabricated placeholder number.
  rating: ratingInfo?.avg || 0,
  reviewCount: ratingInfo?.count || 0,
  createdAt: p.createdAt,
});

// Approved-review rating/count for every property in one query, keyed by
// title (Review rows are matched to a property by title, same lightweight
// pattern the admin Review Moderation tab already uses).
async function getRatingMap() {
  const rows = await Review.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$propertyTitle', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, { avg: r.avg, count: r.count }]));
}

// GET /api/properties
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    const ratingMap = await getRatingMap();
    return res.json({
      success: true,
      properties: properties.map((p) => shapeProperty(p, ratingMap.get(p.title))),
    });
  } catch (error) {
    console.error('Get public properties error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load properties' });
  }
};

// GET /api/properties/:id
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, status: 'active' }).lean();
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const CATEGORY_KEYS = ['cleanliness', 'location', 'accuracy', 'communication', 'checkInOut', 'amenities', 'valueForMoney', 'safety'];
    const [ratingRows, reviews, categoryRows] = await Promise.all([
      Review.aggregate([
        { $match: { propertyTitle: property.title, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Review.find({ propertyTitle: property.title, status: 'approved' }).sort({ createdAt: -1 }).lean(),
      Review.aggregate([
        { $match: { propertyTitle: property.title, status: 'approved' } },
        { $group: CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: { $avg: `$categories.${key}` } }), { _id: null }) },
      ]),
    ]);

    const shaped = shapeProperty(property, ratingRows[0] ? { avg: ratingRows[0].avg, count: ratingRows[0].count } : null);
    shaped.reviews = reviews.map((r) => ({
      reviewerName: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      photos: r.photos || [],
      categories: r.categories || {},
      verified: Boolean(r.verified),
      createdAt: r.createdAt,
    }));
    // Category scores — only the ones with at least one real sub-rating on
    // record are included, never a fabricated default for an empty one.
    const catRow = categoryRows[0] || {};
    shaped.categoryScores = CATEGORY_KEYS.reduce((acc, key) => {
      if (typeof catRow[key] === 'number') acc[key] = catRow[key];
      return acc;
    }, {});

    return res.json({ success: true, property: shaped });
  } catch (error) {
    // Malformed ObjectId also lands here — treat it the same as "not found".
    return res.status(404).json({ success: false, message: 'Property not found' });
  }
};

const shapeBlog = (b) => ({
  id: b._id,
  title: b.title,
  image: b.image,
  author: b.author,
  category: b.category,
  content: b.content,
  createdAt: b.createdAt,
});

// GET /api/blogs
exports.getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, blogs: blogs.map(shapeBlog) });
  } catch (error) {
    console.error('Get public blogs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load blog posts' });
  }
};

// GET /api/blogs/:id
exports.getBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, status: 'published' }).lean();
    if (!blog) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    return res.json({ success: true, blog: shapeBlog(blog) });
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Blog post not found' });
  }
};

const shapeService = (s) => ({
  id: s._id,
  title: s.title,
  images: s.images || [],
  category: s.category,
  provider: s.provider,
  city: s.city,
  area: s.area,
  price: s.price,
  unit: s.unit,
  duration: s.duration || '',
  includes: s.includes || [],
  description: s.description || '',
  featured: Boolean(s.featured),
  verified: Boolean(s.verified),
  createdAt: s.createdAt,
});

// GET /api/services
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, services: services.map(shapeService) });
  } catch (error) {
    console.error('Get public services error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load services' });
  }
};

// GET /api/services/:id
exports.getService = async (req, res) => {
  try {
    const service = await Service.findOne({ _id: req.params.id, status: 'active' }).lean();
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    return res.json({ success: true, service: shapeService(service) });
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Service not found' });
  }
};

// GET /api/reviews — approved property reviews across the whole platform,
// for the public Reviews hub's "Property Reviews" tab. Includes the
// property's id/images so each review can link back to its listing.
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: 'approved' }).sort({ createdAt: -1 }).lean();
    const titles = [...new Set(reviews.map((r) => r.propertyTitle))];
    const properties = await Property.find({ title: { $in: titles } }).select('title images city area').lean();
    const propMap = new Map(properties.map((p) => [p.title, p]));

    const [summaryRows, totalSubmitted] = await Promise.all([
      Review.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Review.countDocuments({}),
    ]);

    return res.json({
      success: true,
      summary: { avg: summaryRows[0]?.avg || 0, count: summaryRows[0]?.count || 0, totalSubmitted },
      reviews: reviews.map((r) => {
        const prop = propMap.get(r.propertyTitle);
        return {
          id: r._id,
          reviewerName: r.reviewerName,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
          propertyTitle: r.propertyTitle,
          propertyId: prop?._id || null,
          propertyImage: prop?.images?.[0] || '',
        };
      }),
    });
  } catch (error) {
    console.error('Get public reviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

// GET /api/affiliate-reviews?affiliate=Name — approved affiliate reviews,
// for the Reviews hub's "Affiliate Reviews" tab and a single affiliate's
// profile page (via the ?affiliate= filter).
exports.getPublicAffiliateReviews = async (req, res) => {
  try {
    const { affiliate } = req.query;
    const match = { status: 'approved' };
    if (affiliate) match.affiliateName = affiliate;

    const [reviews, summaryRows, totalSubmitted] = await Promise.all([
      AffiliateReview.find(match).sort({ createdAt: -1 }).lean(),
      AffiliateReview.aggregate([
        { $match: match },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      AffiliateReview.countDocuments(affiliate ? { affiliateName: affiliate } : {}),
    ]);

    return res.json({
      success: true,
      summary: { avg: summaryRows[0]?.avg || 0, count: summaryRows[0]?.count || 0, totalSubmitted },
      reviews: reviews.map((r) => ({
        id: r._id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        service: r.service || '',
        categories: r.categories || {},
        verified: Boolean(r.verified),
        affiliateName: r.affiliateName,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get public affiliate reviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load affiliate reviews' });
  }
};

const CATEGORY_KEYS = ['communication', 'responsiveness', 'professionalism', 'knowledge', 'honesty', 'propertyAssistance'];

// POST /api/affiliate-reviews — a guest submitting a real review from the
// public "Write a Review" tab on an affiliate's profile. Always created
// as 'pending' so it goes through the same admin moderation queue as
// every other affiliate review — never shown live until approved.
//
// `verified` is computed here, never trusted from the client: true only
// when the reviewer's email matches a completed Booking on one of this
// affiliate's managed properties — the same "no completed transaction =
// no verified review" rule the spec applies to property reviews.
exports.createPublicAffiliateReview = async (req, res) => {
  try {
    const { affiliateName, reviewerName, reviewerEmail, rating, comment, service } = req.body;
    if (!affiliateName || !reviewerName || !reviewerEmail || !rating) {
      return res.status(400).json({ success: false, message: 'Affiliate, name, email and rating are required' });
    }

    const normalizedEmail = String(reviewerEmail).trim().toLowerCase();
    const affiliateDoc = await Affiliate.findOne({ name: String(affiliateName).trim() }).lean();
    let verified = false;
    if (affiliateDoc && affiliateDoc.managedPropertyTitles?.length) {
      const completedBooking = await Booking.findOne({
        guestEmail: normalizedEmail,
        propertyTitle: { $in: affiliateDoc.managedPropertyTitles },
        status: 'completed',
      }).lean();
      verified = Boolean(completedBooking);
    }

    const categories = {};
    CATEGORY_KEYS.forEach((key) => {
      const v = Number(req.body[`cat_${key}`]);
      if (Number.isFinite(v) && v >= 1 && v <= 5) categories[key] = v;
    });

    const review = await AffiliateReview.create({
      affiliateName: String(affiliateName).trim(),
      reviewerName: String(reviewerName).trim(),
      reviewerEmail: normalizedEmail,
      rating: Number(rating),
      comment: (comment || '').trim(),
      service: (service || '').trim(),
      categories,
      verified,
      status: 'pending',
    });
    return res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create public affiliate review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

const shapeAffiliate = (a, ratingInfo) => ({
  id: a._id,
  name: a.name,
  avatar: a.avatar || '',
  role: a.role,
  area: a.area,
  specialty: a.specialty,
  tags: a.tags || [],
  areasServed: a.areasServed || [],
  categoriesServed: a.categoriesServed || [],
  servicesOffered: a.servicesOffered || [],
  responseRate: a.responseRate || 0,
  completedTransactions: a.completedTransactions || 0,
  featured: Boolean(a.featured),
  rating: ratingInfo?.avg || 0,
  reviewCount: ratingInfo?.count || 0,
  createdAt: a.createdAt,
});

async function getAffiliateRatingMap() {
  const rows = await AffiliateReview.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$affiliateName', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, { avg: r.avg, count: r.count }]));
}

// GET /api/affiliates
exports.getAffiliates = async (req, res) => {
  try {
    const affiliates = await Affiliate.find({ status: 'active' }).sort({ createdAt: -1 }).lean();
    const ratingMap = await getAffiliateRatingMap();
    return res.json({
      success: true,
      affiliates: affiliates.map((a) => shapeAffiliate(a, ratingMap.get(a.name))),
    });
  } catch (error) {
    console.error('Get public affiliates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load affiliates' });
  }
};

// GET /api/affiliates/:id
exports.getAffiliate = async (req, res) => {
  try {
    const affiliate = await Affiliate.findOne({ _id: req.params.id, status: 'active' }).lean();
    if (!affiliate) {
      return res.status(404).json({ success: false, message: 'Affiliate not found' });
    }

    const AFF_CATEGORY_KEYS = ['communication', 'responsiveness', 'professionalism', 'knowledge', 'honesty', 'propertyAssistance'];
    const [ratingRows, reviews, managedProperties, categoryRows] = await Promise.all([
      AffiliateReview.aggregate([
        { $match: { affiliateName: affiliate.name, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      AffiliateReview.find({ affiliateName: affiliate.name, status: 'approved' }).sort({ createdAt: -1 }).lean(),
      Property.find({ title: { $in: affiliate.managedPropertyTitles || [] } }).select('title city area price images').lean(),
      AffiliateReview.aggregate([
        { $match: { affiliateName: affiliate.name, status: 'approved' } },
        { $group: AFF_CATEGORY_KEYS.reduce((acc, key) => ({ ...acc, [key]: { $avg: `$categories.${key}` } }), { _id: null }) },
      ]),
    ]);

    const shaped = shapeAffiliate(affiliate, ratingRows[0] ? { avg: ratingRows[0].avg, count: ratingRows[0].count } : null);
    shaped.reviews = reviews.map((r) => ({
      reviewerName: r.reviewerName,
      rating: r.rating,
      comment: r.comment,
      service: r.service || '',
      categories: r.categories || {},
      verified: Boolean(r.verified),
      createdAt: r.createdAt,
    }));
    const affCatRow = categoryRows[0] || {};
    shaped.categoryScores = AFF_CATEGORY_KEYS.reduce((acc, key) => {
      if (typeof affCatRow[key] === 'number') acc[key] = affCatRow[key];
      return acc;
    }, {});
    shaped.managedListings = managedProperties.map((p) => ({
      id: p._id, title: p.title, city: p.city, area: p.area, price: p.price, image: p.images?.[0] || '',
    }));

    return res.json({ success: true, affiliate: shaped });
  } catch (error) {
    return res.status(404).json({ success: false, message: 'Affiliate not found' });
  }
};

// POST /api/affiliates/apply — the public "Become an Affiliate" form.
// Creates a 'pending' Affiliate record that stays invisible on the public
// site (getAffiliates/getAffiliate both filter to status:'active') until
// an admin approves it from the admin console's Affiliates tab.
exports.applyAffiliate = async (req, res) => {
  try {
    const { name, email, phone, area, category, message } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const affiliate = await Affiliate.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phone: (phone || '').trim(),
      areasServed: (area || '').split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
      categoriesServed: category ? [String(category).trim()] : [],
      message: (message || '').trim(),
      status: 'pending',
    });

    return res.status(201).json({ success: true, affiliate: { id: affiliate._id, status: affiliate.status } });
  } catch (error) {
    console.error('Affiliate application error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

// POST /api/contact — the homepage "Contact Us" form. Emails the submission
// to CONTACT_TO_EMAIL via SMTP (see utils/mailer.js); the visitor's own
// address is set as replyTo so the team can reply directly.
exports.sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    if (!mailer.isConfigured()) {
      return res.status(503).json({ success: false, message: 'Email is not configured yet. Please try again later.' });
    }

    const to = process.env.CONTACT_TO_EMAIL || process.env.SMTP_USER;
    await mailer.sendMail({
      to,
      replyTo: String(email).trim(),
      subject: `New contact form message from ${String(name).trim()}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `<p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b></p><p>${String(message).replace(/\n/g, '<br>')}</p>`,
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Contact form send error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};
