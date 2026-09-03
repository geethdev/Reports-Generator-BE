const Report = require('../models/Report');
const User = require('../models/User');
const { getStartOfWeek } = require('../utils/weekRange');

async function getSummary(req, res) {
  const weekStart = getStartOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [totalTeamMembers, submittedThisWeek, needsCorrectionCount, openBlockersCount] = await Promise.all([
    User.countDocuments({ role: 'team_member' }),
    Report.countDocuments({
      weekStartDate: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ['submitted', 'needs_correction', 'approved'] },
    }),
    Report.countDocuments({ status: 'needs_correction' }),
    Report.countDocuments({
      status: { $ne: 'approved' },
      'content.blockers': { $exists: true, $ne: '' },
    }),
  ]);

  const complianceRate = totalTeamMembers === 0 ? 0 : Math.round((submittedThisWeek / totalTeamMembers) * 100);

  res.json({
    weekStart,
    totalTeamMembers,
    submittedThisWeek,
    complianceRate,
    needsCorrectionCount,
    openBlockersCount,
  });
}

async function getCharts(req, res) {
  const [statusBreakdown, byProject, byMember, weeklyTrend] = await Promise.all([
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Report.aggregate([
      { $group: { _id: '$project', count: { $sum: 1 } } },
      { $lookup: { from: 'projects', localField: '_id', foreignField: '_id', as: 'project' } },
      { $unwind: '$project' },
      { $project: { _id: 0, project: '$project.name', count: 1 } },
    ]),
    Report.aggregate([
      { $group: { _id: '$owner', count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'owner' } },
      { $unwind: '$owner' },
      { $project: { _id: 0, member: '$owner.name', count: 1 } },
    ]),
    Report.aggregate([
      { $match: { status: { $in: ['submitted', 'needs_correction', 'approved'] } } },
      { $group: { _id: '$weekStartDate', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 6 },
      { $project: { _id: 0, weekStartDate: '$_id', count: 1 } },
    ]),
  ]);

  res.json({
    statusBreakdown: statusBreakdown.map((s) => ({ status: s._id, count: s.count })),
    byProject,
    byMember,
    weeklyTrend,
  });
}

module.exports = { getSummary, getCharts };
