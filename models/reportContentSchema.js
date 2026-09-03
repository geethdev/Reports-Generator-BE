const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    taskName: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    plannedPercent: { type: Number, min: 0, max: 100, default: 0 },
    actualPercent: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "blocked"],
      default: "not_started",
    },
    timePlannedHours: { type: Number, min: 0, default: 0 },
    timeSpentHours: { type: Number, min: 0, default: 0 },
    output: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const flaggedNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    isKey: { type: Boolean, default: false },
  },
  { _id: false },
);

const hoursByCategorySchema = new mongoose.Schema(
  {
    development: { type: Number, min: 0, default: 0 },
    testing: { type: Number, min: 0, default: 0 },
    meetings: { type: Number, min: 0, default: 0 },
    documentation: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const reportContentSchema = new mongoose.Schema(
  {
    tasks: {
      type: [taskSchema],
      default: [],
    },
    planForNextWeek: {
      type: String,
      required: true,
      trim: true,
    },
    blockers: {
      type: [flaggedNoteSchema],
      default: [],
    },
    achievements: {
      type: [flaggedNoteSchema],
      default: [],
    },
    hoursByCategory: {
      type: hoursByCategorySchema,
      default: () => ({}),
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

module.exports = reportContentSchema;
