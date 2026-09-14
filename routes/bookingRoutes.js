// routes/bookingRoutes.js
// The real public "Request to Book" flow, mounted at /api/bookings — all
// protected, since a booking always belongs to a logged-in guest (see
// server/controllers/bookingController.js's createMyBooking/getMyBooking).
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { createMyBooking, getMyBooking, createMyReview, getMyReviewEligibility } = require('../controllers/bookingController');

const router = express.Router();

router.post('/', protect, createMyBooking);
router.get('/:id', protect, getMyBooking);
router.get('/:id/review-eligibility', protect, getMyReviewEligibility);
router.post('/:id/review', protect, upload.array('photos', 6), createMyReview);

module.exports = router;
