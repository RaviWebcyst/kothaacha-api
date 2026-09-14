// routes/paymentRoutes.js
// Booking checkout, mounted at /api/payments — every route is protected
// since a payment is always tied to a booking owned by the logged-in
// guest (see server/controllers/paymentController.js).
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

const router = express.Router();

router.post('/khalti/initiate', protect, paymentController.initiateKhalti);
router.post('/khalti/verify', protect, paymentController.verifyKhalti);
router.post('/esewa/initiate', protect, paymentController.initiateEsewa);
router.post('/esewa/verify', protect, paymentController.verifyEsewa);
router.post('/fonepay/initiate', protect, paymentController.initiateFonepay);
router.post('/nepalpayqr/initiate', protect, paymentController.initiateNepalPayQr);
router.post('/card/initiate', protect, paymentController.initiateCard);

module.exports = router;
