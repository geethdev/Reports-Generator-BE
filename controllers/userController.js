const User = require('../models/User');

async function listUsers(req, res) {
  const users = await User.find({ role: 'team_member' }).select('name email role').sort({ name: 1 });
  res.json({ users });
}

module.exports = { listUsers };
