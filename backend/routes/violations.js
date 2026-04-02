const router = require('express').Router();
const Violation = require('../models/Violation');
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};

// Log a violation
router.post('/', auth, async (req, res) => {
  try {
    const v = await Violation.create({ ...req.body, student: req.user.id });
    req.app.get('io').emit('violation_alert', { ...req.body, student: req.user.id });
    res.json(v);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Get violations for student
router.get('/mine', auth, async (req, res) => {
  const vs = await Violation.find({ student: req.user.id }).sort('-createdAt').limit(20);
  res.json(vs);
});

// Get all violations (admin)
router.get('/all', auth, async (req, res) => {
  const vs = await Violation.find().populate('student', 'name email').sort('-createdAt').limit(50);
  res.json(vs);
});

module.exports = router;
