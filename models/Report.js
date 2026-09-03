const mongoose = require('mongoose');
const reportContentSchema = require('./reportContentSchema');

const previousVersionSchema = new mongoose.Schema(
  {
    versionNumber: {
      type: Number,
      required: true,
    },
    content: {
      type: reportContentSchema,
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false }
);

const reviewHistorySchema = new mongoose.Schema(
  {
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['approved', 'requested_changes'],
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    weekStartDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'needs_correction', 'approved'],
      default: 'draft',
    },
    content: {
      type: reportContentSchema,
      required: true,
    },
    currentVersionNumber: {
      type: Number,
      default: 1,
    },
    previousVersions: {
      type: [previousVersionSchema],
      default: [],
    },
    reviewHistory: {
      type: [reviewHistorySchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
