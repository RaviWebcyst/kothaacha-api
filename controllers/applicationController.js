// controllers/applicationController.js
// The guest-facing side of the property Application flow (submit + track
// your own application/invoice) — mirrors bookingController's
// createMyBooking/getMyBooking ownership pattern. Admin review lives in
// adminApplicationController.js.
const Application = require('../models/Application');
const ApplicationInvoice = require('../models/ApplicationInvoice');
const Property = require('../models/Property');

// POST /api/applications — a logged-in guest applying to rent or buy a
// property. Always starts 'submitted'; only an admin can move it forward.
exports.createMyApplication = async (req, res) => {
  try {
    const { propertyId, type, message } = req.body;
    if (!propertyId || !['rental', 'purchase'].includes(type)) {
      return res.status(400).json({ success: false, message: 'A property and application type (rental or purchase) are required' });
    }

    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const application = await Application.create({
      userId: req.user._id,
      propertyId: property._id,
      propertyTitle: property.title,
      type,
      applicantName: req.user.name,
      applicantEmail: req.user.email,
      applicantContact: req.user.contact || '',
      message: (message || '').trim(),
    });

    return res.status(201).json({ success: true, application });
  } catch (error) {
    console.error('Create application error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit application' });
  }
};

// GET /api/applications/:id — only visible to the guest who submitted it
// (used by the application-status/invoice page).
exports.getMyApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).lean();
    if (!application || String(application.userId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    return res.json({ success: true, application });
  } catch (error) {
    console.error('Get application error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load application' });
  }
};

// GET /api/applications/:id/invoice — the latest invoice issued for this
// application (there's normally just one — the downpayment — until
// installment scheduling exists), same ownership check as above.
exports.getMyApplicationInvoice = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).lean();
    if (!application || String(application.userId) !== String(req.user._id)) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const invoice = await ApplicationInvoice.findOne({ applicationId: application._id }).sort({ createdAt: -1 }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'No invoice has been issued for this application yet' });
    }

    return res.json({ success: true, invoice });
  } catch (error) {
    console.error('Get application invoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load invoice' });
  }
};
