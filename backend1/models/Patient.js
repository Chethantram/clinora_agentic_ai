const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema(
  {
    patient_id: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    age: Number,
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: '',
    },
    blood_group: String,
    diagnosis: [String],
    allergies: [String],
    status: {
      type: String,
      enum: ['stable', 'monitoring', 'critical'],
      default: 'stable',
    },
    bmi: Number,
    city: String,
    smoking: Boolean,
    alcohol: Boolean,
    lastVisit: Date,
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'patients', timestamps: true }
);


PatientSchema.index({ name: 'text', email: 'text' });
PatientSchema.index({ status: 1 });

module.exports = mongoose.model('Patient', PatientSchema);
