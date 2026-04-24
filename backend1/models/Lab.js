const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema(
  {
    patient_id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    test: {
      type: String,
      required: true,
    },
    test_name: String,
    value: mongoose.Schema.Types.Mixed,
    unit: String,
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['Normal', 'Abnormal', 'Critical', 'High', 'Low', 'Borderline', 'Monitor', 'unknown'],
      default: 'Normal',
    },
    normal_range: String,
    referenceRange: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'labs', timestamps: true }
);

LabSchema.index({ patient_id: 1, date: -1 });
LabSchema.index({ test: 1, status: 1 });

module.exports = mongoose.model('Lab', LabSchema);
