// controllers/clientController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { splitName, joinName } = require('../utils/splitName');

const CLIENT_ROLES = User.CLIENT_ROLES; // ['user', 'owner']

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
    status: user.status || 'active',
    createdAt: user.createdAt,
  };
};

// GET /api/admin/clients
exports.getClients = async (req, res) => {
  try {
    // .lean() returns the raw stored documents, so legacy records that only
    // have a `name` field (not firstName/lastName) still surface that data
    // instead of it being stripped by schema hydration.
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const clients = await User.find({ role: { $in: CLIENT_ROLES } }).sort({ createdAt: 1 }).lean();
    const shaped = clients.map((c, i) => ({ ...shape(c), serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, clients: shaped });
  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load clients' });
  }
};

// POST /api/admin/clients
exports.createClient = async (req, res) => {
  try {
    const { name, email, contact, role, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const clientRole = CLIENT_ROLES.includes(role) ? role : 'user';
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const { firstName, lastName } = splitName(name);

    const client = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      contact: (contact || '').trim(),
      role: clientRole,
      password: hashedPassword,
      status: 'active',
    });

    return res.status(201).json({ success: true, client: shape(client) });
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create client' });
  }
};

// PUT /api/admin/clients/:id
exports.updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, contact, role, password } = req.body;

    const client = await User.findOne({ _id: id, role: { $in: CLIENT_ROLES } });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (email && email.trim().toLowerCase() !== client.email) {
      const normalizedEmail = email.trim().toLowerCase();
      const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already in use' });
      }
      client.email = normalizedEmail;
    }

    if (name) {
      const { firstName, lastName } = splitName(name);
      client.firstName = firstName;
      client.lastName = lastName;
    }
    if (contact !== undefined) client.contact = contact.trim();
    if (role && CLIENT_ROLES.includes(role)) client.role = role;
    if (password) client.password = await bcrypt.hash(password, 12);

    await client.save();

    return res.json({ success: true, client: shape(client) });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update client' });
  }
};

// PATCH /api/admin/clients/:id/status  { status: 'active' | 'suspended' }
exports.setClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active or suspended' });
    }

    const client = await User.findOneAndUpdate(
      { _id: id, role: { $in: CLIENT_ROLES } },
      { status },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    return res.json({ success: true, client: shape(client) });
  } catch (error) {
    console.error('Set client status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// DELETE /api/admin/clients/:id
exports.deleteClient = async (req, res) => {
  try {
    const { id } = req.params;
    const client = await User.findOneAndDelete({ _id: id, role: { $in: CLIENT_ROLES } });

    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete client' });
  }
};
