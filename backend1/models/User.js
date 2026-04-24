const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    id: String,
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      default: 'patient',
    },
    phone: String,
    specialization: String,
    department: String,
    license_number: String,
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    lastLogin: Date,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'users', timestamps: true }
);


UserSchema.index({ role: 1 });

module.exports = mongoose.model('User', UserSchema);
