// controllers/dashboardController.js
const User = require('../models/User');
const Property = require('../models/Property');
const Blog = require('../models/Blog');

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const [totalProperties, totalBlogs, totalClients, totalAdmins] = await Promise.all([
      Property.countDocuments(),
      Blog.countDocuments(),
      User.countDocuments({ role: { $in: User.CLIENT_ROLES } }),
      User.countDocuments({ role: { $in: User.ADMIN_PANEL_ROLES } }),
    ]);

    return res.json({
      success: true,
      stats: { totalProperties, totalBlogs, totalClients, totalAdmins },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
};
