const User = require('../models/User');
const Report = require('../models/Report');

async function listUsers(req, res) {
  const users = await User.find({ role: 'team_member' }).select('name email role').sort({ name: 1 });
  res.json({ users });
}

async function getUserProfile(req, res) {
  const member = await User.findOne({ _id: req.params.id, role: 'team_member' }).select('name email role');

  if (!member) {
    return res.status(404).json({ message: 'Team member not found' });
  }

  const [statusCounts, reports] = await Promise.all([
    Report.aggregate([
      { $match: { owner: member._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Report.find({ owner: member._id })
      .populate('project', 'name')
      .sort({ weekStartDate: -1 })
      .limit(20),
  ]);

  const stats = { draft: 0, submitted: 0, needs_correction: 0, approved: 0 };
  statusCounts.forEach((s) => {
    stats[s._id] = s.count;
  });
  const totalReports = Object.values(stats).reduce((sum, n) => sum + n, 0);

  res.json({ member, stats: { ...stats, total: totalReports }, reports });
}

module.exports = { listUsers, getUserProfile };
