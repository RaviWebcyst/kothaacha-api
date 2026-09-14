// controllers/reviewController.js
const Review = require('../models/Review');

const STATUSES = ['pending', 'approved', 'rejected'];

// GET /api/admin/reviews
exports.getReviews = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const reviews = await Review.find().sort({ createdAt: 1 }).lean();
    const shaped = reviews.map((r, i) => ({ ...r, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, reviews: shaped });
  } catch (error) {
    console.error('Get reviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reviews' });
  }
};

// POST /api/admin/reviews
exports.createReview = async (req, res) => {
  try {
    const { propertyTitle, reviewerName, reviewerEmail, rating, comment, status } = req.body;

    if (!propertyTitle || !reviewerName || !reviewerEmail || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Property, reviewer name, reviewer email and rating are required',
      });
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.create({
      propertyTitle: propertyTitle.trim(),
      reviewerName: reviewerName.trim(),
      reviewerEmail: reviewerEmail.trim().toLowerCase(),
      rating: ratingNum,
      comment: (comment || '').trim(),
      status: STATUSES.includes(status) ? status : 'pending',
    });

    return res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};

// PUT /api/admin/reviews/:id
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyTitle, reviewerName, reviewerEmail, rating, comment, status } = req.body;

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    if (rating !== undefined) {
      const ratingNum = Number(rating);
      if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
      }
      review.rating = ratingNum;
    }

    if (propertyTitle) review.propertyTitle = propertyTitle.trim();
    if (reviewerName) review.reviewerName = reviewerName.trim();
    if (reviewerEmail) review.reviewerEmail = reviewerEmail.trim().toLowerCase();
    if (comment !== undefined) review.comment = comment.trim();
    if (status) review.status = status;

    await review.save();

    return res.json({ success: true, review });
  } catch (error) {
    console.error('Update review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update review' });
  }
};

// PATCH /api/admin/reviews/:id/status  { status: 'pending' | 'approved' | 'rejected' }
exports.setReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    return res.json({ success: true, review });
  } catch (error) {
    console.error('Set review status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// DELETE /api/admin/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};
