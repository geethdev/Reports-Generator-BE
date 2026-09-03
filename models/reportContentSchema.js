const mongoose = require('mongoose');

const reportContentSchema = new mongoose.Schema(
  {
    tasksCompleted: {
      type: String,
      required: true,
      trim: true,
    },
    blockers: {
      type: String,
      trim: true,
      default: '',
    },
    planForNextWeek: {
      type: String,
      required: true,
      trim: true,
    },
    hoursWorked: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

module.exports = reportContentSchema;
