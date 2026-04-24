const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema(
  {
    patient_id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    drug: {
      type: String,
      required: true,
    },
    name: String,
    dose: String,
    dosage: String,
    frequency: String,
    route: String,
    start_date: Date,
    since: Date,
    end_date: Date,
    active: {
      type: Boolean,
      default: true,
    },
    prescribed_by: String,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'medications', timestamps: true }
);

MedicationSchema.index({ patient_id: 1, active: 1 });
MedicationSchema.index({ drug: 'text' });

module.exports = mongoose.model('Medication', MedicationSchema);
