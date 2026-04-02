const router = require('express').Router();
const Exam = require('../models/Exam');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Admin access required' });
  next();
};

// GET all exams
router.get('/', auth, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? { createdBy: req.user.id } : {};
    const exams = await Exam.find(filter).populate('createdBy', 'name').select('-questions.answer');
    res.json(exams);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET single exam
router.get('/:id', auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).select('-questions.answer');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// CREATE exam — admin only
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.create({ ...req.body, createdBy: req.user.id });
    res.json(exam);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// UPDATE exam — admin only
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });
    Object.assign(exam, req.body);
    await exam.save();
    res.json(exam);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE exam — admin only
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or unauthorized' });
    res.json({ message: 'Exam deleted' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// SUBMIT exam — students only
router.post('/:id/submit', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin')
      return res.status(403).json({ message: 'Admins cannot submit exams' });
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    const { answers } = req.body;
    let score = 0;
    exam.questions.forEach((q, i) => { if (answers[i] === q.answer) score++; });
    const percent = Math.round((score / exam.questions.length) * 100);
    res.json({ score, total: exam.questions.length, percent });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
