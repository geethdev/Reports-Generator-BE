require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Project = require("../models/Project");
const Report = require("../models/Report");
const { getStartOfWeek } = require("../utils/weekRange");

const PASSWORD = "password123";

const MEMBERS = ["Alice Johnson", "Bob Smith", "Carol Lee", "Dave Patel"];
const PROJECTS = [
  { name: "Website Revamp", description: "Q3 marketing site redesign" },
  { name: "Mobile App", description: "iOS/Android companion app" },
  { name: "Internal Tools", description: "Internal dashboards and tooling" },
];

function weeksAgo(n) {
  const start = getStartOfWeek();
  start.setUTCDate(start.getUTCDate() - n * 7);
  return start;
}

function content(memberName, weekLabel) {
  return {
    tasksCompleted: `${memberName} completed key tasks for ${weekLabel}`,
    blockers: weekLabel === "this week" ? "Waiting on design sign-off" : "",
    planForNextWeek: "Continue with planned deliverables",
    hoursWorked: 35 + Math.floor(Math.random() * 8),
  };
}

async function buildReport({
  owner,
  project,
  weekStartDate,
  weekLabel,
  memberName,
  status,
  managerId,
}) {
  const originalContent = content(memberName, weekLabel);

  const base = {
    owner,
    project,
    weekStartDate,
    content: originalContent,
  };

  if (status === "draft") {
    return { ...base, status: "draft", currentVersionNumber: 1 };
  }

  const submittedAt = new Date(weekStartDate);
  submittedAt.setUTCDate(submittedAt.getUTCDate() + 4);

  const previousVersions = [
    { versionNumber: 1, content: originalContent, submittedAt },
  ];

  if (status === "submitted") {
    return {
      ...base,
      status: "submitted",
      currentVersionNumber: 2,
      previousVersions,
    };
  }

  if (status === "needs_correction") {
    const revisedContent = {
      ...originalContent,
      blockers: "Need clearer scope from manager",
    };
    return {
      ...base,
      content: revisedContent,
      status: "needs_correction",
      currentVersionNumber: 2,
      previousVersions,
      reviewHistory: [
        {
          reviewer: managerId,
          action: "requested_changes",
          comment: "Please add more detail on blockers and next steps",
          reviewedAt: submittedAt,
        },
      ],
    };
  }

  return {
    ...base,
    status: "approved",
    currentVersionNumber: 2,
    previousVersions,
    reviewHistory: [
      {
        reviewer: managerId,
        action: "approved",
        comment: "Looks good, thanks!",
        reviewedAt: submittedAt,
      },
    ],
  };
}

async function seed() {
  await connectDB();

  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Report.deleteMany({}),
  ]);

  console.log("Creating manager and team members...");
  const manager = await User.create({
    name: "Priya Sharma",
    email: "manager@example.com",
    password: PASSWORD,
    role: "manager",
  });

  const members = await Promise.all(
    MEMBERS.map((name) =>
      User.create({
        name,
        email: `${name.split(" ")[0].toLowerCase()}@example.com`,
        password: PASSWORD,
        role: "team_member",
      }),
    ),
  );

  console.log("Creating projects...");
  const projects = await Promise.all(
    PROJECTS.map((p) => Project.create({ ...p, createdBy: manager._id })),
  );

  console.log("Creating reports...");

  const statusPlan = [
    ["approved", "submitted", "draft"],
    ["approved", "needs_correction", "submitted"],
    ["needs_correction", "approved", "draft"],
    ["submitted", "approved", "draft"],
  ];

  const reportDocs = [];
  for (let i = 0; i < members.length; i += 1) {
    const member = members[i];
    const project = projects[i % projects.length];
    const [twoWeeksStatus, lastWeekStatus, thisWeekStatus] = statusPlan[i];

    reportDocs.push(
      await buildReport({
        owner: member._id,
        project: project._id,
        weekStartDate: weeksAgo(2),
        weekLabel: "2 weeks ago",
        memberName: member.name,
        status: twoWeeksStatus,
        managerId: manager._id,
      }),
    );
    reportDocs.push(
      await buildReport({
        owner: member._id,
        project: project._id,
        weekStartDate: weeksAgo(1),
        weekLabel: "last week",
        memberName: member.name,
        status: lastWeekStatus,
        managerId: manager._id,
      }),
    );
    reportDocs.push(
      await buildReport({
        owner: member._id,
        project: project._id,
        weekStartDate: weeksAgo(0),
        weekLabel: "this week",
        memberName: member.name,
        status: thisWeekStatus,
        managerId: manager._id,
      }),
    );
  }

  await Report.insertMany(reportDocs);

  console.log("Seed complete:");
  console.log(`  1 manager (manager@example.com / ${PASSWORD})`);
  console.log(
    `  ${members.length} team members (e.g. alice@example.com / ${PASSWORD})`,
  );
  console.log(`  ${projects.length} projects`);
  console.log(`  ${reportDocs.length} reports`);

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
