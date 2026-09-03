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

module.exports = { createReport, updateReport };
