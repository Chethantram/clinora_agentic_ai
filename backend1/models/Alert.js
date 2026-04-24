const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    patient_id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['alert', 'lab', 'drug_interaction', 'test_overdue', 'critical_value', 'pattern'],
      default: 'alert',
    },
    severity: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    title: String,
    message: {
      type: String,
      required: true,
    },
    date: Date,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: Date,
    resolvedBy: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'alerts', timestamps: true }
);

AlertSchema.index({ patient_id: 1, timestamp: -1 });
AlertSchema.index({ severity: 1 });
AlertSchema.index({ resolved: 1 });

module.exports = mongoose.model('Alert', AlertSchema);
