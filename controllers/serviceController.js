// controllers/serviceController.js
const fs = require('fs');
const path = require('path');
const Service = require('../models/Service');

// Best-effort delete of uploaded files (never let cleanup failures break a
// request) — only touches paths under /uploads, never external URLs.
const deleteUploadedFiles = (urls = []) => {
  urls.forEach((url) => {
    if (!url || !url.startsWith('/uploads/')) return;
    fs.unlink(path.join(__dirname, '..', url), () => {});
  });
};

const filesToPaths = (files = []) => files.map((f) => `/uploads/${f.filename}`);

const toBool = (v) => v === true || v === 'true';

// `includes` is edited as a plain textarea (one bullet per line) rather
// than a checkbox group, since "what's included" is free text specific to
// each service — split on newlines, dropping blank lines.
const toArray = (v) => {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim()).filter(Boolean);
  } catch {
    // Not JSON — treat as newline-separated plain text below.
  }
  return String(v).split('\n').map((s) => s.trim()).filter(Boolean);
};

// GET /api/admin/services
exports.getServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: 1 }).lean();
    const shaped = services.map((s, i) => ({ ...s, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, services: shaped });
  } catch (error) {
    console.error('Get services error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load services' });
  }
};

// POST /api/admin/services
// multipart/form-data — image files arrive on req.files (field name "images").
exports.createService = async (req, res) => {
  try {
    const { title, category, provider, city, area, price, unit, duration, includes, description, featured, verified, status } = req.body;

    if (!title || !category || !provider || !city || price === undefined || price === '') {
      deleteUploadedFiles(filesToPaths(req.files));
      return res.status(400).json({ success: false, message: 'Title, category, provider, city and price are required' });
    }

    const service = await Service.create({
      title: title.trim(),
      images: filesToPaths(req.files),
      category: category.trim(),
      provider: provider.trim(),
      city: city.trim(),
      area: (area || '').trim(),
      price: Number(price),
      unit: (unit || 'session').trim(),
      duration: (duration || '').trim(),
      includes: toArray(includes),
      description: description || '',
      featured: toBool(featured),
      verified: toBool(verified),
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({ success: true, service });
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create service' });
  }
};

// PUT /api/admin/services/:id
// multipart/form-data — `keepImages` is a JSON-stringified array of
// existing image URLs the admin left unchecked/kept, same pattern as
// property photo management.
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, keepImages, category, provider, city, area, price, unit, duration, includes, description, featured, verified, status } = req.body;

    const service = await Service.findById(id);
    if (!service) {
      deleteUploadedFiles(filesToPaths(req.files));
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    if (title) service.title = title.trim();
    if (category) service.category = category.trim();
    if (provider) service.provider = provider.trim();
    if (city) service.city = city.trim();
    if (area !== undefined) service.area = area.trim();
    if (price !== undefined && price !== '') service.price = Number(price);
    if (unit !== undefined) service.unit = unit.trim();
    if (duration !== undefined) service.duration = duration.trim();
    if (includes !== undefined) service.includes = toArray(includes);
    if (description !== undefined) service.description = description;
    if (featured !== undefined) service.featured = toBool(featured);
    if (verified !== undefined) service.verified = toBool(verified);
    if (status && ['active', 'inactive'].includes(status)) service.status = status;

    if (keepImages !== undefined) {
      let kept = [];
      try {
        kept = JSON.parse(keepImages);
        if (!Array.isArray(kept)) kept = [];
      } catch {
        kept = [];
      }
      const removed = service.images.filter((url) => !kept.includes(url));
      deleteUploadedFiles(removed);
      service.images = [...kept, ...filesToPaths(req.files)];
    } else if (req.files && req.files.length) {
      service.images = [...service.images, ...filesToPaths(req.files)];
    }

    await service.save();

    return res.json({ success: true, service });
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update service' });
  }
};

// DELETE /api/admin/services/:id
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    deleteUploadedFiles(service.images);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete service' });
  }
};
