// controllers/paymentController.js
//
// Sandbox payment integrations for the booking checkout flow. Only Khalti
// and eSewa have publicly self-serve sandbox environments — Fonepay,
// NEPALPAY QR, and card (Visa/Mastercard) all require an actual merchant
// agreement even to get UAT credentials, so those three respond with a
// clear "not configured yet" message instead of faking a transaction.
const crypto = require('crypto');
const Booking = require('../models/Booking');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || 'https://dev.khalti.com/api/v2';
const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY || '';

const ESEWA_FORM_URL = process.env.ESEWA_FORM_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const ESEWA_STATUS_URL = process.env.ESEWA_STATUS_URL || 'https://rc.esewa.com.np/api/epay/transaction/status/';
// eSewa's published sandbox test merchant + shared secret — not sensitive,
// this pair is the same for every developer testing against their sandbox.
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST';
const ESEWA_SECRET_KEY = process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q';

async function findOwnedBooking(bookingId, userId) {
  const booking = await Booking.findById(bookingId);
  if (!booking || String(booking.userId) !== String(userId)) return null;
  return booking;
}

// POST /api/payments/khalti/initiate  { bookingId }
exports.initiateKhalti = async (req, res) => {
  try {
    if (!KHALTI_SECRET_KEY) {
      return res.status(501).json({
        success: false,
        message: 'Khalti sandbox is not configured yet — sign up for a free test account at test-admin.khalti.com and add KHALTI_SECRET_KEY to server/.env.',
      });
    }

    const booking = await findOwnedBooking(req.body.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This booking is already paid.' });
    }

    const response = await fetch(`${KHALTI_BASE_URL}/epayment/initiate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${KHALTI_SECRET_KEY}` },
      body: JSON.stringify({
        return_url: `${FRONTEND_URL}/booking/payment-callback?method=khalti&bookingId=${booking._id}`,
        website_url: FRONTEND_URL,
        amount: Math.round(booking.price * 100), // paisa
        purchase_order_id: String(booking._id),
        purchase_order_name: booking.propertyTitle,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.payment_url) {
      return res.status(502).json({ success: false, message: data.detail || 'Khalti did not accept this payment request.' });
    }

    booking.paymentMethod = 'khalti';
    booking.paymentStatus = 'pending';
    booking.paymentRef = data.pidx;
    await booking.save();

    return res.json({ success: true, payment_url: data.payment_url, pidx: data.pidx });
  } catch (error) {
    console.error('Khalti initiate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start Khalti payment' });
  }
};

// POST /api/payments/khalti/verify  { bookingId }
exports.verifyKhalti = async (req, res) => {
  try {
    const booking = await findOwnedBooking(req.body.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.paymentRef) return res.status(400).json({ success: false, message: 'No Khalti payment was started for this booking.' });

    const response = await fetch(`${KHALTI_BASE_URL}/epayment/lookup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${KHALTI_SECRET_KEY}` },
      body: JSON.stringify({ pidx: booking.paymentRef }),
    });
    const data = await response.json();

    if (data.status === 'Completed') {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.paidAt = new Date();
    } else if (data.status === 'Pending' || data.status === 'Initiated') {
      booking.paymentStatus = 'pending';
    } else {
      booking.paymentStatus = 'failed';
    }
    await booking.save();

    return res.json({ success: true, gatewayStatus: data.status, booking });
  } catch (error) {
    console.error('Khalti verify error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify Khalti payment' });
  }
};

// POST /api/payments/esewa/initiate  { bookingId }
exports.initiateEsewa = async (req, res) => {
  try {
    const booking = await findOwnedBooking(req.body.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'This booking is already paid.' });
    }

    const transactionUuid = `${booking._id}-${Date.now()}`;
    const totalAmount = booking.price;
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = crypto.createHmac('sha256', ESEWA_SECRET_KEY).update(message).digest('base64');

    booking.paymentMethod = 'esewa';
    booking.paymentStatus = 'pending';
    booking.paymentRef = transactionUuid;
    await booking.save();

    return res.json({
      success: true,
      action: ESEWA_FORM_URL,
      fields: {
        amount: totalAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: ESEWA_PRODUCT_CODE,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: `${FRONTEND_URL}/booking/payment-callback?method=esewa&bookingId=${booking._id}`,
        failure_url: `${FRONTEND_URL}/booking/payment-callback?method=esewa&bookingId=${booking._id}&failed=1`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
    });
  } catch (error) {
    console.error('eSewa initiate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start eSewa payment' });
  }
};

// POST /api/payments/esewa/verify  { bookingId }
exports.verifyEsewa = async (req, res) => {
  try {
    const booking = await findOwnedBooking(req.body.bookingId, req.user._id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (!booking.paymentRef) return res.status(400).json({ success: false, message: 'No eSewa payment was started for this booking.' });

    const url = `${ESEWA_STATUS_URL}?product_code=${ESEWA_PRODUCT_CODE}&total_amount=${booking.price}&transaction_uuid=${booking.paymentRef}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'COMPLETE') {
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.paidAt = new Date();
    } else if (data.status === 'PENDING') {
      booking.paymentStatus = 'pending';
    } else {
      booking.paymentStatus = 'failed';
    }
    await booking.save();

    return res.json({ success: true, gatewayStatus: data.status, booking });
  } catch (error) {
    console.error('eSewa verify error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify eSewa payment' });
  }
};

// Fonepay QR, NEPALPAY QR, and Visa/Mastercard all need a real merchant
// agreement before there's anything — sandbox or otherwise — to call. No
// generic self-serve test credentials exist for these the way they do for
// Khalti/eSewa, so this responds honestly instead of faking success.
const notConfigured = (label) => (req, res) => {
  res.status(501).json({
    success: false,
    message: `${label} isn't available yet — it requires a merchant onboarding agreement, and no public sandbox exists for it. Once merchant credentials are issued, this endpoint is ready to wire up.`,
  });
};
exports.initiateFonepay = notConfigured('Fonepay QR');
exports.initiateNepalPayQr = notConfigured('NEPALPAY QR');
exports.initiateCard = notConfigured('Visa/Mastercard');
