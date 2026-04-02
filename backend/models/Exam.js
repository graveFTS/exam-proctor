const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: String,
  options: [String],
  answer: Number, // index of correct option
});

const ExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  duration: { type: Number, default: 30 }, // minutes
  questions: [QuestionSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Exam', ExamSchema);
