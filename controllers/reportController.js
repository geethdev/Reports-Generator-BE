const Report = require('../models/Report');

async function createReport(req, res) {
  const { project, weekStartDate, content } = req.body;

  if (!project || !weekStartDate || !content) {
    return res.status(400).json({ message: 'project, weekStartDate and content are required' });
  }

  const report = await Report.create({
    owner: req.user._id,
    project,
    weekStartDate,
    content,
  });

  res.status(201).json({ report });
}

async function updateReport(req, res) {
  const report = await Report.findById(req.params.id);

  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  if (report.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden: not the owner of this report' });
  }

  if (!['draft', 'needs_correction'].includes(report.status)) {
    return res.status(400).json({ message: `Cannot edit a report with status "${report.status}"` });
  }

  const { weekStartDate, content } = req.body;

  if (weekStartDate !== undefined) report.weekStartDate = weekStartDate;
  if (content !== undefined) report.content = content;

  await report.save();
  res.json({ report });
}

async function submitReport(req, res) {
  const report = await Report.findById(req.params.id);

  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  if (report.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Forbidden: not the owner of this report' });
  }

  if (!['draft', 'needs_correction'].includes(report.status)) {
    return res.status(400).json({ message: `Cannot submit a report with status "${report.status}"` });
  }

  report.previousVersions.push({
    versionNumber: report.currentVersionNumber,
    content: report.content,
    submittedAt: new Date(),
  });
  report.currentVersionNumber += 1;
  report.status = 'submitted';

  await report.save();
  res.json({ report });
}

async function listMyReports(req, res) {
  const { page = 1, limit = 10, weekStartDate } = req.query;

  const filter = { owner: req.user._id };
  if (weekStartDate) filter.weekStartDate = new Date(weekStartDate);

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('project', 'name')
      .sort({ weekStartDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  res.json({
    reports,
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
}

async function getReportById(req, res) {
  const report = await Report.findById(req.params.id).populate('project', 'name').populate('owner', 'name email');

  if (!report) {
    return res.status(404).json({ message: 'Report not found' });
  }

  const isOwner = report.owner._id.toString() === req.user._id.toString();
  const isManager = req.user.role === 'manager';

  if (!isOwner && !isManager) {
    return res.status(403).json({ message: 'Forbidden: cannot view this report' });
  }

  res.json({ report });
}

async function listTeamReports(req, res) {
  const { page = 1, limit = 10, member, project, status, dateFrom, dateTo } = req.query;

  const filter = {};
  if (member) filter.owner = member;
  if (project) filter.project = project;
  if (status) filter.status = status;
  if (dateFrom || dateTo) {
    filter.weekStartDate = {};
    if (dateFrom) filter.weekStartDate.$gte = new Date(dateFrom);
    if (dateTo) filter.weekStartDate.$lte = new Date(dateTo);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('project', 'name')
      .populate('owner', 'name email')
      .sort({ weekStartDate: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Report.countDocuments(filter),
  ]);

  res.json({
    reports,
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
}

module.exports = {
  createReport,
  updateReport,
  submitReport,
  listMyReports,
  getReportById,
  listTeamReports,
};
