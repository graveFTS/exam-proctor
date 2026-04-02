const mongoose = require('mongoose');

const ViolationSchema = new mongoose.Schema({
  student:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  exam:     { type: mongoose.Schema.Types.ObjectId, ref: 'Exam' },
  type:     { type: String },
  message:  { type: String },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
}, { timestamps: true });

module.exports = mongoose.model('Violation', ViolationSchema);