const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Violation = require('../models/Violation');
const axios = require('axios');

// 🔐 Auth Middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ✅ Render AI API
const AI_API = process.env.AI_API;

// ── POST /api/proctor/analyze ──
router.post('/analyze', auth, async (req, res) => {
  try {
    const { image, examId } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'No image provided' });
    }

    // 🔥 Call Render AI instead of Colab
    const aiRes = await axios.post(`${AI_API}/analyze`, { image }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // Render can be slower than Colab sometimes
    });

    const { violations, info, frame_number } = aiRes.data;

    // ✅ Save violations to MongoDB
    if (violations && violations.length > 0) {
      const docs = violations.map(v => ({
        student: req.user.id,
        exam: examId,
        type: v.type,
        message: v.message,
        severity: v.severity,
      }));

      await Violation.insertMany(docs);

      // 🔔 Socket alert
      req.app.get('io').emit('violation_alert', {
        studentId: req.user.id,
        examId,
        violations,
        time: new Date().toLocaleTimeString()
      });
    }

    return res.json({
      violations: violations || [],
      info,
      frame_number
    });

  } catch (err) {
    console.error("AI ERROR:", err.message);

    return res.json({
      violations: [],
      info: {},
      error: 'AI server offline'
    });
  }
});

// ── GET /api/proctor/stats ──
router.get('/stats', auth, async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_API}/stats`, {
      timeout: 8000
    });

    res.json(aiRes.data);

  } catch {
    res.json({
      error: 'AI server offline',
      total_frames: 0,
      total_violations: 0
    });
  }
});

// ── POST /api/proctor/reset ──
router.post('/reset', auth, async (req, res) => {
  try {
    const aiRes = await axios.post(`${AI_API}/reset`, {}, {
      timeout: 8000
    });

    res.json(aiRes.data);

  } catch {
    res.json({ error: 'AI server offline' });
  }
});

// ── GET /api/proctor/health ──
router.get('/health', auth, async (req, res) => {
  try {
    const aiRes = await axios.get(`${AI_API}/health`, {
      timeout: 5000
    });

    res.json({ online: true, ...aiRes.data });

  } catch {
    res.json({ online: false, message: 'AI server offline' });
  }
});

// ── GET violations ──
router.get('/violations/:examId', auth, async (req, res) => {
  try {
    const vs = await Violation.find({
      student: req.user.id,
      exam: req.params.examId
    }).sort('-createdAt');

    res.json(vs);

  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;