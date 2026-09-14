// controllers/propertyController.js
const fs = require('fs');
const path = require('path');
const Property = require('../models/Property');

// Best-effort delete of uploaded files (never let cleanup failures break a
// request) — only touches paths under /uploads, never external URLs (e.g.
// seed data pointing at Wikimedia Commons).
const deleteUploadedFiles = (urls = []) => {
  urls.forEach((url) => {
    if (!url || !url.startsWith('/uploads/')) return;
    const filePath = path.join(__dirname, '..', url);
    fs.unlink(filePath, () => {});
  });
};

const filesToPaths = (files = []) => files.map((f) => `/uploads/${f.filename}`);

// FormData always sends checkbox values as the string "true"/"false".
const toBool = (v) => v === true || v === 'true';

// Checkbox-group fields (amenities) arrive as a JSON-stringified array,
// same pattern as `keepImages`.
const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// `durations` arrives as a JSON-stringified array of { key, price } —
// sanitize into well-formed { key: String, price: Number } entries only.
const toDurations = (v) => {
  const arr = toArray(v);
  return arr
    .map((d) => ({ key: String(d?.key || '').trim(), price: Number(d?.price) }))
    .filter((d) => d.key && Number.isFinite(d.price) && d.price >= 0);
};

// GET /api/admin/properties
exports.getProperties = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const properties = await Property.find().sort({ createdAt: 1 }).lean();
    const shaped = properties.map((p, i) => ({ ...p, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, properties: shaped });
  } catch (error) {
    console.error('Get properties error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load properties' });
  }
};

// POST /api/admin/properties
// multipart/form-data — image files arrive on req.files (field name "images").
exports.createProperty = async (req, res) => {
  try {
    const {
      title, type, city, area, price, bedrooms, bathrooms, guests, durations, amenities, featured, verified, status,
      minStay, maxStay,
      roadAccess, roadWidth, mainRoadDistance, highwayDistance, publicTransportation,
      waterAvailability, electricity, internet, drainageSewerage,
      nearbyHospital, nearbySchool, nearbyMarket, nearbyAirport, nearbyAttractions,
    } = req.body;

    if (!title || !type || !city || price === undefined || price === '') {
      // Uploaded files were already written to disk by multer before this
      // validation ran — clean them up so they don't pile up unused.
      deleteUploadedFiles(filesToPaths(req.files));
      return res.status(400).json({ success: false, message: 'Title, type, city and price are required' });
    }

    const property = await Property.create({
      title: title.trim(),
      images: filesToPaths(req.files),
      type: type.trim(),
      city: city.trim(),
      area: (area || '').trim(),
      price: Number(price),
      bedrooms: Number(bedrooms) || 0,
      bathrooms: Number(bathrooms) || 0,
      guests: Number(guests) || 0,
      durations: toDurations(durations),
      amenities: toArray(amenities),
      featured: toBool(featured),
      verified: toBool(verified),
      minStay: Number(minStay) || 0,
      maxStay: Number(maxStay) || 0,
      roadAccess: (roadAccess || '').trim(),
      roadWidth: (roadWidth || '').trim(),
      mainRoadDistance: (mainRoadDistance || '').trim(),
      highwayDistance: (highwayDistance || '').trim(),
      publicTransportation: (publicTransportation || '').trim(),
      waterAvailability: (waterAvailability || '').trim(),
      electricity: (electricity || '').trim(),
      internet: (internet || '').trim(),
      drainageSewerage: (drainageSewerage || '').trim(),
      nearbyHospital: (nearbyHospital || '').trim(),
      nearbySchool: (nearbySchool || '').trim(),
      nearbyMarket: (nearbyMarket || '').trim(),
      nearbyAirport: (nearbyAirport || '').trim(),
      nearbyAttractions: (nearbyAttractions || '').trim(),
      status: status === 'inactive' ? 'inactive' : 'active',
    });

    return res.status(201).json({ success: true, property });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create property' });
  }
};

// PUT /api/admin/properties/:id
// multipart/form-data — `keepImages` is a JSON-stringified array of
// existing image URLs the admin left unchecked/kept; anything already on
// the property but missing from that list is treated as removed (and its
// file deleted). Newly uploaded files are appended after the kept ones.
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, keepImages, type, city, area, price, bedrooms, bathrooms, guests, durations, amenities, featured, verified, status,
      minStay, maxStay,
      roadAccess, roadWidth, mainRoadDistance, highwayDistance, publicTransportation,
      waterAvailability, electricity, internet, drainageSewerage,
      nearbyHospital, nearbySchool, nearbyMarket, nearbyAirport, nearbyAttractions,
    } = req.body;

    const property = await Property.findById(id);
    if (!property) {
      deleteUploadedFiles(filesToPaths(req.files));
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    if (title) property.title = title.trim();
    if (type) property.type = type.trim();
    if (city) property.city = city.trim();
    if (area !== undefined) property.area = area.trim();
    if (price !== undefined && price !== '') property.price = Number(price);
    if (bedrooms !== undefined) property.bedrooms = Number(bedrooms) || 0;
    if (bathrooms !== undefined) property.bathrooms = Number(bathrooms) || 0;
    if (guests !== undefined) property.guests = Number(guests) || 0;
    if (durations !== undefined) property.durations = toDurations(durations);
    if (amenities !== undefined) property.amenities = toArray(amenities);
    if (featured !== undefined) property.featured = toBool(featured);
    if (verified !== undefined) property.verified = toBool(verified);
    if (minStay !== undefined) property.minStay = Number(minStay) || 0;
    if (maxStay !== undefined) property.maxStay = Number(maxStay) || 0;
    if (roadAccess !== undefined) property.roadAccess = roadAccess.trim();
    if (roadWidth !== undefined) property.roadWidth = roadWidth.trim();
    if (mainRoadDistance !== undefined) property.mainRoadDistance = mainRoadDistance.trim();
    if (highwayDistance !== undefined) property.highwayDistance = highwayDistance.trim();
    if (publicTransportation !== undefined) property.publicTransportation = publicTransportation.trim();
    if (waterAvailability !== undefined) property.waterAvailability = waterAvailability.trim();
    if (electricity !== undefined) property.electricity = electricity.trim();
    if (internet !== undefined) property.internet = internet.trim();
    if (drainageSewerage !== undefined) property.drainageSewerage = drainageSewerage.trim();
    if (nearbyHospital !== undefined) property.nearbyHospital = nearbyHospital.trim();
    if (nearbySchool !== undefined) property.nearbySchool = nearbySchool.trim();
    if (nearbyMarket !== undefined) property.nearbyMarket = nearbyMarket.trim();
    if (nearbyAirport !== undefined) property.nearbyAirport = nearbyAirport.trim();
    if (nearbyAttractions !== undefined) property.nearbyAttractions = nearbyAttractions.trim();
    if (status && ['active', 'inactive'].includes(status)) property.status = status;

    if (keepImages !== undefined) {
      let kept = [];
      try {
        kept = JSON.parse(keepImages);
        if (!Array.isArray(kept)) kept = [];
      } catch {
        kept = [];
      }
      const removed = property.images.filter((url) => !kept.includes(url));
      deleteUploadedFiles(removed);
      property.images = [...kept, ...filesToPaths(req.files)];
    } else if (req.files && req.files.length) {
      property.images = [...property.images, ...filesToPaths(req.files)];
    }

    await property.save();

    return res.json({ success: true, property });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update property' });
  }
};

// DELETE /api/admin/properties/:id
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    deleteUploadedFiles(property.images);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete property' });
  }
};
