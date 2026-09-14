// controllers/adminUserController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { splitName, joinName } = require('../utils/splitName');

const ADMIN_ROLES = User.ADMIN_PANEL_ROLES; // ['admin', 'super_admin', 'approver', 'finance'] — used for listing/lookup
// 'super_admin' is reserved for the one pre-existing top account that logs in
// with it; the admin form can only ever create/update accounts with 'admin'
// (displayed as "Super Admin"), never 'super_admin' itself.
const ASSIGNABLE_ADMIN_ROLES = ['admin', 'approver', 'finance'];

const shape = (user) => {
  // Legacy accounts predate the firstName/lastName split and only have a raw
  // `name` field in the database — fall back to splitting that.
  const legacy = !user.firstName && user.name ? splitName(user.name) : null;
  const firstName = user.firstName || (legacy && legacy.firstName) || '';
  const lastName = user.lastName || (legacy && legacy.lastName) || '';
  return {
    id: user._id,
    name: joinName(firstName, lastName),
    email: user.email,
    contact: user.contact,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  };
};

// GET /api/admin/admins — the logged-in admin never sees themselves in
// this list (per the reference design).
exports.getAdmins = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const admins = await User.find({
      role: { $in: ADMIN_ROLES },
      _id: { $ne: req.user._id },
    }).sort({ createdAt: 1 }).lean();

    const shaped = admins.map((a, i) => ({ ...shape(a), serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, admins: shaped });
  } catch (error) {
    console.error('Get admins error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load admins' });
  }
};

// POST /api/admin/admins
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, contact, role, password } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, role and password are required',
      });
    }

    if (!ASSIGNABLE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ADMIN_ROLES.join(', ')}`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { firstName, lastName } = splitName(name);

    const admin = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      contact: (contact || '').trim(),
      role,
      password: hashedPassword,
      status: 'active',
    });

    return res.status(201).json({ success: true, admin: shape(admin) });
  } catch (error) {
    console.error('Create admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
};

// PUT /api/admin/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, contact, role, password } = req.body;

    const admin = await User.findOne({ _id: id, role: { $in: ADMIN_ROLES } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (role && !ASSIGNABLE_ADMIN_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ASSIGNABLE_ADMIN_ROLES.join(', ')}`,
      });
    }

    if (email && email.trim().toLowerCase() !== admin.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      admin.email = normalizedEmail;
    }

    if (name) {
      const { firstName, lastName } = splitName(name);
      admin.firstName = firstName;
      admin.lastName = lastName;
    }
    if (contact !== undefined) admin.contact = contact.trim();
    if (role) admin.role = role;
    if (password) admin.password = await bcrypt.hash(password, 12);

    await admin.save();

    return res.json({ success: true, admin: shape(admin) });
  } catch (error) {
    console.error('Update admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update admin' });
  }
};

// PATCH /api/admin/admins/:id/status  { status: 'active' | 'suspended' }
exports.setAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended' });
    }

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot suspend your own account' });
    }

    const admin = await User.findOneAndUpdate(
      { _id: id, role: { $in: ADMIN_ROLES } },
      { status },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    return res.json({ success: true, admin: shape(admin) });
  } catch (error) {
    console.error('Set admin status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// DELETE /api/admin/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const admin = await User.findOneAndDelete({ _id: id, role: { $in: ADMIN_ROLES } });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete admin' });
  }
};

// PUT /api/admin/me — self-service profile settings, open to any logged-in
// admin-console role (not gated by requireRole like the /admins CRUD above,
// since every role should be able to edit their own name/contact/password).
exports.updateMyProfile = async (req, res) => {
  try {
    const { name, contact, currentPassword, newPassword } = req.body;

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (name) {
      const { firstName, lastName } = splitName(name.trim());
      admin.firstName = firstName;
      admin.lastName = lastName;
    }
    if (contact !== undefined) admin.contact = contact.trim();

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Enter your current password to set a new one' });
      }
      const isCurrentValid = await bcrypt.compare(currentPassword, admin.password);
      if (!isCurrentValid) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      admin.password = await bcrypt.hash(newPassword, 12);
    }

    await admin.save();

    return res.json({ success: true, message: 'Profile updated', admin: shape(admin) });
  } catch (error) {
    console.error('Update admin profile error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};
