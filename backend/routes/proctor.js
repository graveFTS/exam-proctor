const router = require('express').Router();
const jwt = require('jsonwebtoken');
const Violation = require('../models/Violation');
const axios = require('axios');

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'Invalid token' }); }
};

const COLAB_API = process.env.COLAB_API || '';

// ── POST /api/proctor/analyze ──
// Frontend sends base64 frame → backend forwards to Colab → saves violations → returns result
router.post('/analyze', auth, async (req, res) => {
  try {
    const { image, examId } = req.body;
    if (!image) return res.status(400).json({ message: 'No image provided' });

    // Forward frame to Colab AI
    const colabRes = await axios.post(`${COLAB_API}/analyze`, { image }, {
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'cf-access-skip': 'true'
      },
      timeout: 10000
    });

    const { violations, info, frame_number } = colabRes.data;

    // Save each violation to MongoDB automatically
    if (violations && violations.length > 0) {
      const docs = violations.map(v => ({
        student: req.user.id,
        exam: examId,
        type: v.type,
        message: v.message,
        severity: v.severity,
      }));
      await Violation.insertMany(docs);

      // Emit real-time alert via socket.io
      req.app.get('io').emit('violation_alert', {
        studentId: req.user.id,
        examId,
        violations,
        time: new Date().toLocaleTimeString()
      });
    }

    return res.json({ violations: violations || [], info, frame_number });

  } catch (err) {
    // Colab is offline — return empty so exam continues
    return res.json({ violations: [], info: {}, error: 'AI offline' });
  }
});

// ── GET /api/proctor/stats ──
// Get Colab session stats (total frames, violations detected)
router.get('/stats', auth, async (req, res) => {
  try {
    const colabRes = await axios.get(`${COLAB_API}/stats`, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'cf-access-skip': 'true' },
      timeout: 5000
    });
    res.json(colabRes.data);
  } catch {
    res.json({ error: 'AI server offline', total_frames: 0, total_violations: 0 });
  }
});

// ── POST /api/proctor/reset ──
// Reset Colab stats when a new exam starts
router.post('/reset', auth, async (req, res) => {
  try {
    const colabRes = await axios.post(`${COLAB_API}/reset`, {}, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'cf-access-skip': 'true' },
      timeout: 5000
    });
    res.json(colabRes.data);
  } catch {
    res.json({ error: 'AI server offline' });
  }
});

// ── GET /api/proctor/health ──
// Check if Colab AI is online
router.get('/health', auth, async (req, res) => {
  try {
    const colabRes = await axios.get(`${COLAB_API}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true', 'cf-access-skip': 'true' },
      timeout: 5000
    });
    res.json({ online: true, ...colabRes.data });
  } catch {
    res.json({ online: false, message: 'AI server offline' });
  }
});

// ── GET /api/proctor/violations/:examId ──
// Get all violations for a specific exam (for results page)
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
