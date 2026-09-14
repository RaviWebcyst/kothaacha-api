// routes/authRoutes.js

const express = require('express');
const {
  register,
  login,
  logout,
  adminLogin,
  getMe,
  updateProfile,
  getAffiliateStatus,
  googleAuth,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');
const { getMyBookings } = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/logout', logout);
router.post('/admin/login', adminLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Guest dashboard — self-service endpoints for the logged-in user.
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.get('/my-bookings', protect, getMyBookings);
router.get('/affiliate-status', protect, getAffiliateStatus);

module.exports = router;
