const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const Violation = require('../models/Violation');
const axios   = require('axios');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};

const AI_API = process.env.AI_API;

// ── POST /api/proctor/analyze ──
router.post('/analyze', auth, async (req, res) => {
  try {
    const { image, examId } = req.body;
    if (!image) return res.status(400).json({ message: 'No image' });

    // ✅ Fast timeout — Colab responds in 1-3s
    const aiRes = await axios.post(`${AI_API}/analyze`, { image }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const { violations, info, frame_number } = aiRes.data;

    // Save violations to MongoDB (non-blocking — don't await)
    if (violations && violations.length > 0) {
      const docs = violations.map(v => ({
        student : req.user.id,
        exam    : examId,
        type    : v.type,
        message : v.message,
        severity: v.severity,
      }));
      Violation.insertMany(docs).catch(() => {}); // fire and forget

      // Real-time socket alert
      req.app.get('io').emit('violation_alert', {
        studentId: req.user.id,
        examId,
        violations,
        time: new Date().toLocaleTimeString()
      });
    }

    return res.json({ violations: violations || [], info, frame_number });

  } catch (err) {
    // Return empty so exam continues — never block the student
    return res.json({ violations: [], info: {}, error: 'AI offline' });
  }
});

// ── GET /api/proctor/stats ──
router.get('/stats', auth, async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_API}/stats`, { timeout: 5000 });
    res.json(aiRes.data);
  } catch {
    res.json({ error: 'AI offline', total_frames: 0, total_violations: 0 });
  }
});

// ── POST /api/proctor/reset ──
router.post('/reset', auth, async (req, res) => {
  try {
    const aiRes = await axios.post(`${AI_API}/reset`, {}, { timeout: 5000 });
    res.json(aiRes.data);
  } catch {
    res.json({ error: 'AI offline' });
  }
});

// ── GET /api/proctor/health ──
router.get('/health', auth, async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_API}/health`, { timeout: 5000 });
    res.json({ online: true, ...aiRes.data });
  } catch {
    res.json({ online: false });
  }
});

// ── GET violations for exam ──
router.get('/violations/:examId', auth, async (req, res) => {
  try {
    const vs = await Violation.find({ student: req.user.id, exam: req.params.examId }).sort('-createdAt');
    res.json(vs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;