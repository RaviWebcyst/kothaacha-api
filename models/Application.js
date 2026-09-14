const mongoose = require('mongoose');

// A long-term rental or purchase application for a property — distinct
// from Booking (the instant-checkout, short-stay flow). Goes through an
// admin financial-review step before any money moves: submitted ->
// financial_review (once admin issues a downpayment invoice, see
// ApplicationInvoice) -> approved/rejected. Mirrors "Week 1: define and
// lock application statuses" + "implement status transitions and
// validations" from the application/payment workflow plan.
const STATUSES = ['submitted', 'financial_review', 'approved', 'rejected', 'cancelled'];

// Locked transition table — the controller checks against this before
// writing any status change, so an application can never skip financial
// review or move out of a terminal state.
const ALLOWED_TRANSITIONS = {
  submitted: ['financial_review', 'rejected', 'cancelled'],
  financial_review: ['approved', 'rejected', 'cancelled'],
  approved: [],
  rejected: [],
  cancelled: [],
};

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    // Denormalized snapshot, same lightweight pattern as Booking.propertyTitle.
    propertyTitle: { type: String, required: true, trim: true },
    type: { type: String, enum: ['rental', 'purchase'], required: true },
    applicantName: { type: String, required: true, trim: true },
    applicantEmail: { type: String, required: true, trim: true, lowercase: true },
    applicantContact: { type: String, trim: true, default: '' },
    message: { type: String, trim: true, default: '' },
    status: { type: String, enum: STATUSES, default: 'submitted' },
    adminNotes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

applicationSchema.statics.STATUSES = STATUSES;
applicationSchema.statics.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

module.exports = mongoose.model('Application', applicationSchema);
