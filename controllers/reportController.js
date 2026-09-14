// controllers/reportController.js
const Report = require('../models/Report');

const TARGET_TYPES = ['property', 'review', 'account'];
const STATUSES = ['pending', 'reviewing', 'resolved', 'dismissed'];

// GET /api/admin/reports
exports.getReports = async (req, res) => {
  try {
    // Sort ascending first so we can hand out stable auto-increment numbers
    // in creation order, then reverse for newest-first display.
    const reports = await Report.find().sort({ createdAt: 1 }).lean();
    const shaped = reports.map((r, i) => ({ ...r, serial: i + 1 }));
    shaped.reverse();
    return res.json({ success: true, reports: shaped });
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load reports' });
  }
};

// POST /api/admin/reports
exports.createReport = async (req, res) => {
  try {
    const { reporterName, reporterEmail, targetType, targetName, reason, description, status } = req.body;

    if (!reporterName || !reporterEmail || !targetType || !targetName || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reporter name, email, target type, target name and reason are required',
      });
    }

    if (!TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ success: false, message: `Target type must be one of: ${TARGET_TYPES.join(', ')}` });
    }

    const report = await Report.create({
      reporterName: reporterName.trim(),
      reporterEmail: reporterEmail.trim().toLowerCase(),
      targetType,
      targetName: targetName.trim(),
      reason: reason.trim(),
      description: (description || '').trim(),
      status: STATUSES.includes(status) ? status : 'pending',
    });

    return res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

// PUT /api/admin/reports/:id
exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reporterName, reporterEmail, targetType, targetName, reason, description, status } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (targetType && !TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({ success: false, message: `Target type must be one of: ${TARGET_TYPES.join(', ')}` });
    }
    if (status && !STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    if (reporterName) report.reporterName = reporterName.trim();
    if (reporterEmail) report.reporterEmail = reporterEmail.trim().toLowerCase();
    if (targetType) report.targetType = targetType;
    if (targetName) report.targetName = targetName.trim();
    if (reason) report.reason = reason.trim();
    if (description !== undefined) report.description = description.trim();
    if (status) report.status = status;

    await report.save();

    return res.json({ success: true, report });
  } catch (error) {
    console.error('Update report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

// PATCH /api/admin/reports/:id/status  { status: 'pending' | 'reviewing' | 'resolved' | 'dismissed' }
exports.setReportStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${STATUSES.join(', ')}` });
    }

    const report = await Report.findByIdAndUpdate(id, { status }, { new: true });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    return res.json({ success: true, report });
  } catch (error) {
    console.error('Set report status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// DELETE /api/admin/reports/:id
exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};
