const Report = require("../models/Report");
const User = require("../models/User");
const { getStartOfWeek } = require("../utils/weekRange");

async function getSummary(req, res) {
  const weekStart = getStartOfWeek();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [
    totalTeamMembers,
    submittedThisWeek,
    needsCorrectionCount,
    openBlockersCount,
  ] = await Promise.all([
    User.countDocuments({ role: "team_member" }),
    Report.countDocuments({
      weekStartDate: { $gte: weekStart, $lt: weekEnd },
      status: { $in: ["submitted", "needs_correction", "approved"] },
    }),
    Report.countDocuments({ status: "needs_correction" }),
    Report.countDocuments({
      status: { $ne: "approved" },
      "content.blockers": { $not: { $size: 0 } },
    }),
  ]);

  const complianceRate =
    totalTeamMembers === 0
      ? 0
      : Math.round((submittedThisWeek / totalTeamMembers) * 100);

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
  const [
    statusBreakdown,
    byProjectWorkload,
    byMemberStatus,
    tasksCompletedTrend,
    hoursByCategoryTeamWide,
    recentActivity,
  ] = await Promise.all([
    Report.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

    Report.aggregate([
      { $unwind: { path: "$content.tasks", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$project",
          hours: { $sum: { $ifNull: ["$content.tasks.timeSpentHours", 0] } },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      { $project: { _id: 0, project: "$project.name", hours: 1 } },
    ]),

    Report.aggregate([
      {
        $group: {
          _id: { owner: "$owner", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      {
        $group: {
          _id: "$owner._id",
          member: { $first: "$owner.name" },
          counts: { $push: { status: "$_id.status", count: "$count" } },
        },
      },
      { $project: { _id: 0, member: 1, counts: 1 } },
    ]),

    Report.aggregate([
      { $unwind: "$content.tasks" },
      { $match: { "content.tasks.status": "completed" } },
      { $group: { _id: "$weekStartDate", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 8 },
      { $project: { _id: 0, weekStartDate: "$_id", count: 1 } },
    ]),

    Report.aggregate([
      {
        $group: {
          _id: null,
          development: { $sum: "$content.hoursByCategory.development" },
          testing: { $sum: "$content.hoursByCategory.testing" },
          meetings: { $sum: "$content.hoursByCategory.meetings" },
          documentation: { $sum: "$content.hoursByCategory.documentation" },
        },
      },
      { $project: { _id: 0 } },
    ]),

    Report.aggregate([
      { $unwind: "$reviewHistory" },
      { $sort: { "reviewHistory.reviewedAt": -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: "$project" },
      {
        $project: {
          _id: 0,
          reportId: "$_id",
          member: "$owner.name",
          project: "$project.name",
          weekStartDate: 1,
          action: "$reviewHistory.action",
          comment: "$reviewHistory.comment",
          reviewedAt: "$reviewHistory.reviewedAt",
        },
      },
    ]),
  ]);

  res.json({
    statusBreakdown: statusBreakdown.map((s) => ({
      status: s._id,
      count: s.count,
    })),
    byProjectWorkload,
    byMemberStatus,
    tasksCompletedTrend,
    hoursByCategoryTeamWide: hoursByCategoryTeamWide[0] ?? {
      development: 0,
      testing: 0,
      meetings: 0,
      documentation: 0,
    },
    recentActivity,
  });
}

module.exports = { getSummary, getCharts };
