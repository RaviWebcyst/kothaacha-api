// routes/adminRoutes.js
// Everything here is mounted at /api/admin in server.js.

const express = require('express');

const { protect, adminOnly, requireRole } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const User = require('../models/User');
const adminUserController = require('../controllers/adminUserController');
const clientController = require('../controllers/clientController');
const propertyController = require('../controllers/propertyController');
const blogController = require('../controllers/blogController');
const serviceController = require('../controllers/serviceController');
const reportController = require('../controllers/reportController');
const bookingController = require('../controllers/bookingController');
const reviewController = require('../controllers/reviewController');
const affiliateReviewController = require('../controllers/affiliateReviewController');
const affiliateController = require('../controllers/affiliateController');
const analyticsController = require('../controllers/analyticsController');
const adminApplicationController = require('../controllers/adminApplicationController');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// Every route below requires a logged-in admin-console user.
router.use(protect, adminOnly);

// Used by ProtectedAdminRoute + AdminLogin to verify a stored token.
router.get('/me', (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      name: req.user.name,
      email: req.user.email,
      contact: req.user.contact,
      role: req.user.role,
      status: req.user.status,
    },
  });
});

// Self-service "Profile Settings" (admin topbar avatar menu) — open to
// every admin-console role, unlike /admins below which is super_admin-only.
router.put('/me', adminUserController.updateMyProfile);

// ----- Dashboard stats -----
router.get('/stats', dashboardController.getStats);

// ----- Admins (only 'super_admin' can see this tab at all, let alone
// create/edit/suspend/delete) -----
router.get('/admins', requireRole(...User.SUPER_ADMIN_ROLES), adminUserController.getAdmins);
router.post('/admins', requireRole(...User.SUPER_ADMIN_ROLES), adminUserController.createAdmin);
router.put('/admins/:id', requireRole(...User.SUPER_ADMIN_ROLES), adminUserController.updateAdmin);
router.patch('/admins/:id/status', requireRole(...User.SUPER_ADMIN_ROLES), adminUserController.setAdminStatus);
router.delete('/admins/:id', requireRole(...User.SUPER_ADMIN_ROLES), adminUserController.deleteAdmin);

// ----- Clients -----
router.get('/clients', clientController.getClients);
router.post('/clients', clientController.createClient);
router.put('/clients/:id', clientController.updateClient);
router.patch('/clients/:id/status', clientController.setClientStatus);
router.delete('/clients/:id', clientController.deleteClient);

// ----- Properties (multipart/form-data — up to 12 photos per listing) -----
router.get('/properties', propertyController.getProperties);
router.post('/properties', upload.array('images', 12), propertyController.createProperty);
router.put('/properties/:id', upload.array('images', 12), propertyController.updateProperty);
router.delete('/properties/:id', propertyController.deleteProperty);

// ----- Blog management (multipart/form-data — one cover image per post) -----
router.get('/blogs', blogController.getBlogs);
router.post('/blogs', upload.single('image'), blogController.createBlog);
router.put('/blogs/:id', upload.single('image'), blogController.updateBlog);
router.delete('/blogs/:id', blogController.deleteBlog);

// ----- Services (multipart/form-data — up to 6 photos per service) -----
router.get('/services', serviceController.getServices);
router.post('/services', upload.array('images', 6), serviceController.createService);
router.put('/services/:id', upload.array('images', 6), serviceController.updateService);
router.delete('/services/:id', serviceController.deleteService);

// ----- Reports -----
router.get('/reports', reportController.getReports);
router.post('/reports', reportController.createReport);
router.put('/reports/:id', reportController.updateReport);
router.patch('/reports/:id/status', reportController.setReportStatus);
router.delete('/reports/:id', reportController.deleteReport);

// ----- Bookings -----
router.get('/bookings', bookingController.getBookings);
router.post('/bookings', bookingController.createBooking);
router.put('/bookings/:id', bookingController.updateBooking);
router.patch('/bookings/:id/status', bookingController.setBookingStatus);
router.delete('/bookings/:id', bookingController.deleteBooking);

// ----- Property review moderation -----
router.get('/reviews', reviewController.getReviews);
router.post('/reviews', reviewController.createReview);
router.put('/reviews/:id', reviewController.updateReview);
router.patch('/reviews/:id/status', reviewController.setReviewStatus);
router.delete('/reviews/:id', reviewController.deleteReview);

// ----- Affiliate review moderation -----
router.get('/affiliate-reviews', affiliateReviewController.getAffiliateReviews);
router.post('/affiliate-reviews', affiliateReviewController.createAffiliateReview);
router.put('/affiliate-reviews/:id', affiliateReviewController.updateAffiliateReview);
router.patch('/affiliate-reviews/:id/status', affiliateReviewController.setAffiliateReviewStatus);
router.delete('/affiliate-reviews/:id', affiliateReviewController.deleteAffiliateReview);

// ----- Affiliates (brokers/agents/partners — multipart/form-data, one avatar) -----
router.get('/affiliates', affiliateController.getAffiliates);
router.post('/affiliates', upload.single('avatar'), affiliateController.createAffiliate);
router.put('/affiliates/:id', upload.single('avatar'), affiliateController.updateAffiliate);
router.patch('/affiliates/:id/status', affiliateController.setAffiliateStatus);
router.delete('/affiliates/:id', affiliateController.deleteAffiliate);

// ----- Property applications (long-term rental / purchase) -----
router.get('/applications', adminApplicationController.getApplications);
router.get('/applications/:id', adminApplicationController.getApplicationDetail);
router.patch('/applications/:id/status', adminApplicationController.updateApplicationStatus);
router.post('/applications/:id/invoice', adminApplicationController.createDownpaymentInvoice);

// ----- Analytics -----
router.get('/analytics', analyticsController.getAnalytics);

module.exports = router;
