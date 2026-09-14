// controllers/affiliateController.js
const fs = require('fs');
const path = require('path');
const Affiliate = require('../models/Affiliate');

const deleteUploadedFile = (url) => {
  if (!url || !url.startsWith('/uploads/')) return;
  fs.unlink(path.join(__dirname, '..', url), () => {});
};

const toBool = (v) => v === true || v === 'true';

// Comma-or-newline separated free text -> a clean string array, same
// forgiving parsing as Service's "includes" textarea field.
const toList = (v) => {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (!v) return [];
  return String(v).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
};

// GET /api/admin/affiliates
exports.getAffiliates = async (req, res) => {
  try {
    const affiliates = await Affiliate.find().sort({ createdAt: 1 }).lean();
    const shaped = affiliates.map((a, i) => ({ ...a, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, affiliates: shaped });
  } catch (error) {
    console.error('Get affiliates error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load affiliates' });
  }
};

// POST /api/admin/affiliates
// multipart/form-data — avatar arrives on req.file (field name "avatar").
exports.createAffiliate = async (req, res) => {
  try {
    const { name, role, area, specialty, tags, areasServed, categoriesServed, servicesOffered, responseRate, completedTransactions, managedPropertyTitles, featured, status } = req.body;

    if (!name) {
      if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const affiliate = await Affiliate.create({
      name: name.trim(),
      avatar: req.file ? `/uploads/${req.file.filename}` : '',
      role: (role || 'Affiliate').trim(),
      area: (area || '').trim(),
      specialty: (specialty || '').trim(),
      tags: toList(tags),
      areasServed: toList(areasServed),
      categoriesServed: toList(categoriesServed),
      servicesOffered: toList(servicesOffered),
      responseRate: Number(responseRate) || 0,
      completedTransactions: Number(completedTransactions) || 0,
      managedPropertyTitles: toList(managedPropertyTitles),
      featured: toBool(featured),
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({ success: true, affiliate });
  } catch (error) {
    console.error('Create affiliate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create affiliate' });
  }
};

// PUT /api/admin/affiliates/:id
exports.updateAffiliate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, area, specialty, tags, areasServed, categoriesServed, servicesOffered, responseRate, completedTransactions, managedPropertyTitles, featured, status, removeAvatar } = req.body;

    const affiliate = await Affiliate.findById(id);
    if (!affiliate) {
      if (req.file) deleteUploadedFile(`/uploads/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Affiliate not found' });
    }

    if (name) affiliate.name = name.trim();
    if (role !== undefined) affiliate.role = role.trim();
    if (area !== undefined) affiliate.area = area.trim();
    if (specialty !== undefined) affiliate.specialty = specialty.trim();
    if (tags !== undefined) affiliate.tags = toList(tags);
    if (areasServed !== undefined) affiliate.areasServed = toList(areasServed);
    if (categoriesServed !== undefined) affiliate.categoriesServed = toList(categoriesServed);
    if (servicesOffered !== undefined) affiliate.servicesOffered = toList(servicesOffered);
    if (responseRate !== undefined) affiliate.responseRate = Number(responseRate) || 0;
    if (completedTransactions !== undefined) affiliate.completedTransactions = Number(completedTransactions) || 0;
    if (managedPropertyTitles !== undefined) affiliate.managedPropertyTitles = toList(managedPropertyTitles);
    if (featured !== undefined) affiliate.featured = toBool(featured);
    if (status && ['pending', 'active', 'inactive', 'rejected'].includes(status)) affiliate.status = status;

    if (req.file) {
      deleteUploadedFile(affiliate.avatar);
      affiliate.avatar = `/uploads/${req.file.filename}`;
    } else if (removeAvatar === 'true') {
      deleteUploadedFile(affiliate.avatar);
      affiliate.avatar = '';
    }

    await affiliate.save();

    return res.json({ success: true, affiliate });
  } catch (error) {
    console.error('Update affiliate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update affiliate' });
  }
};

// PATCH /api/admin/affiliates/:id/status
// Approve/reject a pending application, or reactivate/deactivate an
// existing affiliate — same pattern as admin/client status toggling.
exports.setAffiliateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'active', 'inactive', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be pending, active, inactive, or rejected' });
    }

    const affiliate = await Affiliate.findByIdAndUpdate(id, { status }, { new: true });
    if (!affiliate) {
      return res.status(404).json({ success: false, message: 'Affiliate not found' });
    }

    return res.json({ success: true, affiliate });
  } catch (error) {
    console.error('Set affiliate status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update affiliate status' });
  }
};

// DELETE /api/admin/affiliates/:id
exports.deleteAffiliate = async (req, res) => {
  try {
    const affiliate = await Affiliate.findByIdAndDelete(req.params.id);
    if (!affiliate) {
      return res.status(404).json({ success: false, message: 'Affiliate not found' });
    }
    deleteUploadedFile(affiliate.avatar);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete affiliate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete affiliate' });
  }
};
