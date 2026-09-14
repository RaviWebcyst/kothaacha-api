// controllers/adminApplicationController.js
// Admin review side of the property Application flow — list/view
// applications, move them through the locked status transitions
// (Application.ALLOWED_TRANSITIONS), and issue the downpayment invoice
// that starts the payment flow (Weeks 1 & 3 of the workflow plan).
const Application = require('../models/Application');
const ApplicationInvoice = require('../models/ApplicationInvoice');

// GET /api/admin/applications
exports.getApplications = async (req, res) => {
  try {
    const applications = await Application.find().sort({ createdAt: 1 }).lean();
    const shaped = applications.map((a, i) => ({ ...a, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, applications: shaped });
  } catch (error) {
    console.error('Get applications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load applications' });
  }
};

// GET /api/admin/applications/:id — includes every invoice issued for it.
exports.getApplicationDetail = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).lean();
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const invoices = await ApplicationInvoice.find({ applicationId: application._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, application, invoices });
  } catch (error) {
    console.error('Get application detail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load application' });
  }
};

// PATCH /api/admin/applications/:id/status — only allows moves that are
// actually in Application.ALLOWED_TRANSITIONS for the current status, so
// e.g. a 'submitted' application can never jump straight to 'approved'
// without ever going through financial review.
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    if (!Application.STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${Application.STATUSES.join(', ')}` });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const allowed = Application.ALLOWED_TRANSITIONS[application.status] || [];
    if (status !== application.status && !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from "${application.status}" to "${status}". Allowed next steps: ${allowed.length ? allowed.join(', ') : 'none — this is a final status'}.`,
      });
    }

    application.status = status;
    if (adminNotes !== undefined) application.adminNotes = adminNotes.trim();
    await application.save();

    return res.json({ success: true, application });
  } catch (error) {
    console.error('Update application status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update application status' });
  }
};

// POST /api/admin/applications/:id/invoice — admin manually creates the
// downpayment invoice and emails it to the applicant (Week 3). Also
// advances the application into 'financial_review', same locked-transition
// check as updateApplicationStatus so this can't fire from an already
// approved/rejected application.
exports.createDownpaymentInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, dueDate, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A positive invoice amount is required' });
    }

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const allowed = Application.ALLOWED_TRANSITIONS[application.status] || [];
    if (application.status !== 'financial_review' && !allowed.includes('financial_review')) {
      return res.status(400).json({ success: false, message: `Cannot issue an invoice while the application is "${application.status}".` });
    }

    const invoice = await ApplicationInvoice.create({
      applicationId: application._id,
      type: 'downpayment',
      amount: Number(amount),
      dueDate: dueDate || undefined,
      notes: (notes || '').trim(),
    });

    if (application.status !== 'financial_review') {
      application.status = 'financial_review';
      await application.save();
    }

    // Real email delivery needs a mail provider (SMTP/SES/etc.) wired into
    // this project, which doesn't exist yet — logged here so the "email
    // invoice to tenant/buyer" step is at least visible during review,
    // same honesty tradeoff as other admin-set placeholders in this app.
    console.log(`[application invoice] Would email invoice ${invoice._id} (NPR ${invoice.amount}) to ${application.applicantEmail} for application ${application._id}`);

    return res.status(201).json({ success: true, invoice, application });
  } catch (error) {
    console.error('Create downpayment invoice error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create invoice' });
  }
};
