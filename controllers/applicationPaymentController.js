// controllers/applicationPaymentController.js
// Payment integration for Application downpayment invoices (Week 4 of the
// workflow plan) — mirrors paymentController.js's Khalti flow for
// Bookings exactly, just keyed to an ApplicationInvoice instead. Khalti
// only for now: it's the one gateway with a real self-serve sandbox (see
// paymentController.js's own comment) — eSewa/Fonepay/etc. can be added
// the same way once there's a reason to.
const Application = require('../models/Application');
const ApplicationInvoice = require('../models/ApplicationInvoice');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2';
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

async function findOwnedInvoice(applicationId, userId) {
  const application = await Application.findById(applicationId).lean();
  if (!application || String(application.userId) !== String(userId)) return null;
  const invoice = await ApplicationInvoice.findOne({ applicationId }).sort({ createdAt: -1 });
  if (!invoice) return null;
  return { application, invoice };
}

// POST /api/applications/:id/payment/khalti/initiate
exports.initiateKhalti = async (req, res) => {
  try {
    if (!KHALTI_SECRET_KEY) {
      return res.status(501).json({
        success: false,
        message: 'Khalti sandbox is not configured yet — sign up for a free test account at test-admin.khalti.com and add KHALTI_SECRET_KEY to server/.env.',
      });
    }

    const found = await findOwnedInvoice(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const { application, invoice } = found;
    if (invoice.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This invoice is already paid.' });
    }

    const response = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${KHALTI_SECRET_KEY}` },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/application/payment-callback?applicationId=${application._id}`,
        website_url: FRONTEND_URL,
        amount: Math.round(invoice.amount * 100), // paisa
        purchase_order_id: String(invoice._id),
        purchase_order_name: `${application.propertyTitle} — downpayment`,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.payment_url) {
      return res.status(502).json({ success: false, message: data.detail || 'Khalti did not accept this payment request.' });
    }

    invoice.paymentMethod = 'khalti';
    invoice.status = 'pending';
    invoice.paymentRef = data.pidx;
    await invoice.save();

    return res.json({ success: true, payment_url: data.payment_url, pidx: data.pidx });
  } catch (error) {
    console.error('Application Khalti initiate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start Khalti payment' });
  }
};

async function markPaidFromGateway(invoice, application) {
  // Idempotent: a payment already marked paid (by the webhook arriving
  // first, or a repeat verify call) is left untouched rather than
  // reprocessed — the light-weight version of Week 7's "webhook
  // idempotency checks", worth having from day one rather than bolted on
  // later.
  if (invoice.status === 'paid') return;
  invoice.status = 'paid';
  invoice.paidAt = new Date();
  await invoice.save();

  if (application.status !== 'approved') {
    application.status = 'approved';
    await application.save();
  }
}

// POST /api/applications/:id/payment/khalti/verify — the client-driven
// check after the gateway redirects back (same pattern as
// paymentController.verifyKhalti for bookings).
exports.verifyKhalti = async (req, res) => {
  try {
    const found = await findOwnedInvoice(req.params.id, req.user._id);
    if (!found) return res.status(404).json({ success: false, message: 'Invoice not found' });
    const { application, invoice } = found;
    if (!invoice.paymentRef) return res.status(400).json({ success: false, message: 'No Khalti payment was started for this invoice.' });

    const response = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${KHALTI_SECRET_KEY}` },
      body: JSON.stringify({ pidx: invoice.paymentRef }),
    });
    const data = await response.json();

    if (data.status === 'Completed') {
      await markPaidFromGateway(invoice, application);
    } else if (data.status === 'Pending' || data.status === 'Initiated') {
      invoice.status = 'pending';
      await invoice.save();
    } else {
      invoice.status = 'failed';
      await invoice.save();
    }

    return res.json({ success: true, gatewayStatus: data.status, invoice, application });
  } catch (error) {
    console.error('Application Khalti verify error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify Khalti payment' });
  }
};

// POST /api/applications/payment/khalti/webhook — public (Khalti's own
// servers call this directly, not a logged-in guest's browser). Configure
// this URL in the Khalti merchant dashboard once this app is deployed
// somewhere reachable; in local dev it just sits ready but uncalled,
// same as the client-driven verify above is the real confirmation path
// until then.
exports.webhookKhalti = async (req, res) => {
  try {
    const { pidx, status } = req.body || {};
    if (!pidx) return res.status(400).json({ success: false, message: 'Missing pidx' });

    const invoice = await ApplicationInvoice.findOne({ paymentRef: pidx });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found for this payment' });

    if (status === 'Completed') {
      const application = await Application.findById(invoice.applicationId);
      if (application) await markPaidFromGateway(invoice, application);
    } else if (status === 'Expired' || status === 'User canceled') {
      if (invoice.status !== 'paid') {
        invoice.status = 'failed';
        await invoice.save();
      }
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Application Khalti webhook error:', error);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};
