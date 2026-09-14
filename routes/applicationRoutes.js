// routes/applicationRoutes.js
// The real "apply to rent/buy" + downpayment-invoice-payment flow, mounted
// at /api/applications — mirrors bookingRoutes.js/paymentRoutes.js
// (protected, since an application/invoice always belongs to a logged-in
// guest), except the Khalti webhook, which Khalti's own servers call
// directly and so can't carry a guest's auth token.
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createMyApplication, getMyApplication, getMyApplicationInvoice } = require('../controllers/applicationController');
const { initiateKhalti, verifyKhalti, webhookKhalti } = require('../controllers/applicationPaymentController');

const router = express.Router();

router.post('/', protect, createMyApplication);
router.get('/:id', protect, getMyApplication);
router.get('/:id/invoice', protect, getMyApplicationInvoice);
router.post('/:id/payment/khalti/initiate', protect, initiateKhalti);
router.post('/:id/payment/khalti/verify', protect, verifyKhalti);

// Public — no `protect`, called by Khalti's servers, not a guest browser.
router.post('/payment/khalti/webhook', webhookKhalti);

module.exports = router;
