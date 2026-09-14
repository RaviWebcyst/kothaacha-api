const mongoose = require('mongoose');

// Admin-managed bookings. `propertyTitle` is a denormalized snapshot (not a
// ref) — same lightweight pattern as Report's targetName — so the admin
// table never depends on a join/populate. `userId`/`propertyId` are set
// only for bookings created through the real public booking+payment flow
// (server/controllers/bookingController.js's createMyBooking); admin-typed
// bookings can leave them blank.
const bookingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyTitle: { type: String, required: true, trim: true },
    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, trim: true, lowercase: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    guests: { type: Number, min: 1, default: 1 },
    durationKey: { type: String, trim: true, default: '' },
    price: { type: Number, required: true, min: 0 }, // total booking price (NPR)
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
    },
    // Payment lifecycle is tracked separately from the booking `status`
    // above — a booking can sit "pending" while its payment is "paid"
    // (awaiting host confirmation), or "confirmed" the moment payment
    // clears (see paymentController's khalti/esewa verify handlers).
    paymentMethod: {
      type: String,
      enum: ['', 'khalti', 'esewa', 'fonepay', 'nepalpayqr', 'card'],
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed'],
      default: 'unpaid',
    },
    // Gateway's own transaction identifier: Khalti's `pidx`, eSewa's
    // `transaction_uuid`. Needed to re-verify/look up the transaction.
    paymentRef: { type: String, trim: true, default: '' },
    paidAt: { type: Date },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
