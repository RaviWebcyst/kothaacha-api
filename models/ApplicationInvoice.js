const mongoose = require('mongoose');

// The admin-issued invoice for an Application — a downpayment first
// (Week 3 of the plan), with `type` left open for a later installment
// schedule (Week 6) without a schema change. Kept as its own collection
// (not embedded on Application) so an application can carry a history of
// invoices instead of just one.
const applicationInvoiceSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    type: { type: String, enum: ['downpayment', 'installment'], default: 'downpayment' },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' },
    // Same gateway lifecycle fields as Booking's payment tracking —
    // paymentRef is the gateway's own transaction id (Khalti's `pidx`),
    // needed to re-verify/look up the transaction.
    paymentMethod: { type: String, enum: ['', 'khalti', 'esewa', 'fonepay', 'nepalpayqr', 'card'], default: '' },
    paymentRef: { type: String, trim: true, default: '' },
    paidAt: { type: Date },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApplicationInvoice', applicationInvoiceSchema);
