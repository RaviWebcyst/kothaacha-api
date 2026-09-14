// routes/publicRoutes.js
// Unauthenticated routes for the public site — mounted directly at /api in
// server.js (not under /api/admin, which requires a logged-in admin).
const express = require('express');
const publicController = require('../controllers/publicController');

const router = express.Router();

router.get('/properties', publicController.getProperties);
router.get('/properties/:id', publicController.getProperty);
router.get('/blogs', publicController.getBlogs);
router.get('/blogs/:id', publicController.getBlog);
router.get('/services', publicController.getServices);
router.get('/services/:id', publicController.getService);
router.get('/reviews', publicController.getReviews);
router.get('/affiliate-reviews', publicController.getPublicAffiliateReviews);
router.post('/affiliate-reviews', publicController.createPublicAffiliateReview);
router.get('/affiliates', publicController.getAffiliates);
router.post('/affiliates/apply', publicController.applyAffiliate);
router.post('/contact', publicController.sendContactMessage);
router.get('/affiliates/:id', publicController.getAffiliate);

module.exports = router;
