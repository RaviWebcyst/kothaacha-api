// controllers/analyticsController.js
// Aggregated data for the admin Analytics tab. Every number here comes from
// a real Mongo aggregation over the same collections the other admin tabs
// manage (Booking/Review/AffiliateReview/Property/User/Report) — nothing
// is mocked.
const User = require('../models/User');
const Property = require('../models/Property');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const AffiliateReview = require('../models/AffiliateReview');
const Report = require('../models/Report');

const MONTHS = 6; // trend window shown on the charts

// Builds the last N month buckets (oldest first) as { key: "2026-04", label: "Apr 2026" }.
function monthBuckets(n) {
  const buckets = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    buckets.push({ key, label });
  }
  return buckets;
}

// Turns aggregation results keyed by "YYYY-MM" into a value aligned to
// `buckets`, defaulting missing months to 0.
function alignToBuckets(buckets, rows, keyField = '_id', valueField = 'count') {
  const map = new Map(rows.map((r) => [r[keyField], r[valueField]]));
  return buckets.map((b) => map.get(b.key) || 0);
}

exports.getAnalytics = async (req, res) => {
  try {
    const buckets = monthBuckets(MONTHS);
    const since = new Date(new Date().getFullYear(), new Date().getMonth() - (MONTHS - 1), 1);

    const [
      totalClients,
      totalProperties,
      totalBookings,
      revenueAgg,
      bookingsByStatusAgg,
      bookingsByMonthAgg,
      revenueByMonthAgg,
      clientsByMonthAgg,
      topPropertiesAgg,
      reviewsByRatingAgg,
      affiliateReviewsByRatingAgg,
      avgPropertyRatingAgg,
      avgAffiliateRatingAgg,
      pendingReviews,
      pendingAffiliateReviews,
      openReports,
    ] = await Promise.all([
      User.countDocuments({ role: { $in: User.CLIENT_ROLES } }),
      Property.countDocuments({ status: 'active' }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: '$price' } } },
      ]),
      User.aggregate([
        { $match: { role: { $in: User.CLIENT_ROLES }, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      ]),
      Booking.aggregate([
        { $group: { _id: '$propertyTitle', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Review.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]),
      AffiliateReview.aggregate([{ $group: { _id: '$rating', count: { $sum: 1 } } }]),
      Review.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      AffiliateReview.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
      Review.countDocuments({ status: 'pending' }),
      AffiliateReview.countDocuments({ status: 'pending' }),
      Report.countDocuments({ status: { $in: ['pending', 'reviewing'] } }),
    ]);

    const statusMap = Object.fromEntries(bookingsByStatusAgg.map((r) => [r._id, r.count]));
    const ratingMap = (rows) => [1, 2, 3, 4, 5].map((n) => rows.find((r) => r._id === n)?.count || 0);

    return res.json({
      success: true,
      analytics: {
        summary: {
          totalClients,
          totalProperties,
          totalBookings,
          totalRevenue: revenueAgg[0]?.total || 0,
          avgPropertyRating: avgPropertyRatingAgg[0]?.avg || 0,
          avgAffiliateRating: avgAffiliateRatingAgg[0]?.avg || 0,
          pendingReviews: pendingReviews + pendingAffiliateReviews,
          openReports,
        },
        bookingsByStatus: {
          pending: statusMap.pending || 0,
          confirmed: statusMap.confirmed || 0,
          completed: statusMap.completed || 0,
          cancelled: statusMap.cancelled || 0,
        },
        months: buckets.map((b) => b.label),
        bookingsByMonth: alignToBuckets(buckets, bookingsByMonthAgg),
        revenueByMonth: alignToBuckets(buckets, revenueByMonthAgg),
        clientsByMonth: alignToBuckets(buckets, clientsByMonthAgg),
        topProperties: topPropertiesAgg.map((r) => ({ title: r._id || 'Unknown', count: r.count })),
        propertyRatingDistribution: ratingMap(reviewsByRatingAgg),
        affiliateRatingDistribution: ratingMap(affiliateReviewsByRatingAgg),
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load analytics' });
  }
};
