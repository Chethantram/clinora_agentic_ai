const mongoose = require('mongoose');

const VisitSchema = new mongoose.Schema(
  {
    patient_id: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    doctor: String,
    department: String,
    visit_type: String,
    chiefComplaint: String,
    symptoms: [String],
    clinicalNote: String,
    doctor_notes: String,
    plan: String,
    bp_systolic: Number,
    bp_diastolic: Number,
    pulse_bpm: Number,
    temperature_c: Number,
    spo2_pct: Number,
    weight_kg: Number,
    diagnosis: [String],
    medications_prescribed: [String],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'visits', timestamps: true }
);

VisitSchema.index({ patient_id: 1, date: -1 });
VisitSchema.index({ date: 1 });

module.exports = mongoose.model('Visit', VisitSchema);
