// controllers/bookingController.js
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const Review = require('../models/Review');

const STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

// Rough day-length per duration key, only used to derive a checkOut date
// from a quantity — the public booking form (Property.js) doesn't collect
// a real calendar date range yet, just "how many of this duration".
const DURATION_DAYS = { daily: 1, weekly: 7, biweekly: 14, monthly: 30, longterm: 30, custom: 1 };

// Per the spec's "prevent double booking" rule — two ranges overlap when
// one starts before the other ends, on both sides. Cancelled bookings
// don't block anything; everything else (pending/confirmed/completed)
// does, since a completed booking can still have future-dated ranges from
// admin-entered data.
async function hasOverlap(query, checkIn, checkOut, excludeId) {
  const overlap = {
    ...query,
    status: { $ne: 'cancelled' },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId) overlap._id = { $ne: excludeId };
  const existing = await Booking.findOne(overlap).lean();
  return Boolean(existing);
}

// GET /api/auth/my-bookings — the logged-in guest's own bookings. Matches
// by userId when present (real bookings created via createMyBooking
// below), falling back to email for older/admin-typed rows.
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ userId: req.user._id }, { guestEmail: req.user.email }],
    }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get my bookings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load your bookings' });
  }
};

// GET /api/bookings/:id — a single booking, only visible to the guest who
// made it (used by the payment page to show a summary before checkout).
exports.getMyBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking || String(booking.userId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    return res.json({ success: true, booking });
  } catch (error) {
    console.error('Get booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load booking' });
  }
};

// POST /api/bookings — the real public "Request to Book" flow (Property.js
// booking box). Price is always recomputed server-side from the
// property's own duration pricing — never trust a client-sent total.
exports.createMyBooking = async (req, res) => {
  try {
    const { propertyId, durationKey, quantity, guests } = req.body;

    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const durations = property.durations && property.durations.length
      ? property.durations
      : [{ key: 'daily', price: property.price }];
    const duration = durations.find((d) => d.key === durationKey) || durations[0];
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const days = (DURATION_DAYS[duration.key] || 1) * qty;

    if (property.minStay && days < property.minStay) {
      return res.status(400).json({ success: false, message: `This property requires a minimum stay of ${property.minStay} night${property.minStay === 1 ? '' : 's'}.` });
    }
    if (property.maxStay && days > property.maxStay) {
      return res.status(400).json({ success: false, message: `This property allows a maximum stay of ${property.maxStay} night${property.maxStay === 1 ? '' : 's'}.` });
    }

    const checkIn = new Date();
    const checkOut = new Date(checkIn.getTime() + days * 24 * 60 * 60 * 1000);

    if (await hasOverlap({ propertyId: property._id }, checkIn, checkOut)) {
      return res.status(409).json({ success: false, message: 'This property is already booked for overlapping dates. Please choose different dates.' });
    }

    const booking = await Booking.create({
      userId: req.user._id,
      propertyId: property._id,
      propertyTitle: property.title,
      guestName: req.user.name || req.user.email,
      guestEmail: req.user.email,
      checkIn,
      checkOut,
      guests: Math.max(1, parseInt(guests, 10) || 1),
      durationKey: duration.key,
      price: Number(duration.price) * qty,
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Create my booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

// GET /api/admin/bookings
exports.getBookings = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const bookings = await Booking.find().sort({ createdAt: 1 }).lean();
    const shaped = bookings.map((b, i) => ({ ...b, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, bookings: shaped });
  } catch (error) {
    console.error('Get bookings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
};

// POST /api/admin/bookings
exports.createBooking = async (req, res) => {
  try {
    const { propertyTitle, guestName, guestEmail, checkIn, checkOut, guests, price, status, notes } = req.body;

    if (!propertyTitle || !guestName || !guestEmail || !checkIn || !checkOut || price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        message: 'Property, guest name, guest email, check-in, check-out and price are required',
      });
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }

    if (await hasOverlap({ propertyTitle: propertyTitle.trim() }, new Date(checkIn), new Date(checkOut))) {
      return res.status(409).json({ success: false, message: 'This property already has a booking for overlapping dates.' });
    }

    const booking = await Booking.create({
      propertyTitle: propertyTitle.trim(),
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      checkIn,
      checkOut,
      guests: Number(guests) || 1,
      price: Number(price),
      status: STATUSES.includes(status) ? status : 'pending',
      notes: (notes || '').trim(),
    });

    return res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

// PUT /api/admin/bookings/:id
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyTitle, guestName, guestEmail, checkIn, checkOut, guests, price, status, notes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const nextCheckIn = checkIn || booking.checkIn;
    const nextCheckOut = checkOut || booking.checkOut;
    if (new Date(nextCheckOut) <= new Date(nextCheckIn)) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }

    const nextTitle = propertyTitle ? propertyTitle.trim() : booking.propertyTitle;
    if (await hasOverlap({ propertyTitle: nextTitle }, new Date(nextCheckIn), new Date(nextCheckOut), booking._id)) {
      return res.status(409).json({ success: false, message: 'This property already has a booking for overlapping dates.' });
    }

    if (propertyTitle) booking.propertyTitle = propertyTitle.trim();
    if (guestName) booking.guestName = guestName.trim();
    if (guestEmail) booking.guestEmail = guestEmail.trim().toLowerCase();
    if (checkIn) booking.checkIn = checkIn;
    if (checkOut) booking.checkOut = checkOut;
    if (guests !== undefined) booking.guests = Number(guests) || 1;
    if (price !== undefined && price !== '') booking.price = Number(price);
    if (status) booking.status = status;
    if (notes !== undefined) booking.notes = notes.trim();

    await booking.save();

    return res.json({ success: true, booking });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
};

// PATCH /api/admin/bookings/:id/status  { status: 'pending' | 'confirmed' | 'cancelled' | 'completed' }
exports.setBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const booking = await Booking.findByIdAndUpdate(id, { status }, { new: true });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.json({ success: true, booking });
  } catch (error) {
    console.error('Set booking status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// DELETE /api/admin/bookings/:id
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete booking' });
  }
};

const CATEGORY_KEYS = ['cleanliness', 'location', 'accuracy', 'communication', 'checkInOut', 'amenities', 'valueForMoney', 'safety'];

// POST /api/bookings/:id/review — the spec's core rule in code: a review
// can only be created from a booking that (a) belongs to the requesting
// guest and (b) is actually marked 'completed'. No booking, no review —
// full stop. Always created verified:true, since it's provably tied to a
// real completed stay (still goes through the normal moderation queue).
exports.createMyReview = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || String(booking.userId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review a completed stay.' });
    }

    const existing = await Review.findOne({ bookingId: booking._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already reviewed this stay.' });
    }

    const { rating, comment } = req.body;
    if (!rating) {
      return res.status(400).json({ success: false, message: 'An overall star rating is required.' });
    }

    const categories = {};
    CATEGORY_KEYS.forEach((key) => {
      const v = Number(req.body[`cat_${key}`]);
      if (Number.isFinite(v) && v >= 1 && v <= 5) categories[key] = v;
    });

    const review = await Review.create({
      propertyTitle: booking.propertyTitle,
      bookingId: booking._id,
      reviewerName: req.user.name || req.user.email,
      reviewerEmail: req.user.email,
      rating: Number(rating),
      comment: (comment || '').trim(),
      photos: (req.files || []).map((f) => `/uploads/${f.filename}`),
      categories,
      verified: true,
      status: 'pending',
    });

    return res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create my review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review' });
  }
};

// GET /api/bookings/:id/review-eligibility — lets the dashboard show a
// "Leave a review" button only where it would actually be accepted.
exports.getMyReviewEligibility = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking || String(booking.userId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const existing = await Review.findOne({ bookingId: booking._id }).lean();
    return res.json({
      success: true,
      eligible: booking.status === 'completed' && !existing,
      alreadyReviewed: Boolean(existing),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to check review eligibility' });
  }
};
