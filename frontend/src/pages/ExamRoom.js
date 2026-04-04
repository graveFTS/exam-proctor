import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import WebcamMonitor from '../components/Webcam';
import Notifications from '../components/Notifications';
import Timer from '../components/Timer';

// ✅ Compress image before sending to save bandwidth & speed up Render
const compressImage = (base64, quality = 0.5, maxWidth = 320) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64;
  });
};

export default function ExamRoom() {
  const { id } = useParams();
  const nav = useNavigate();
  const webcamRef = useRef(null);
  const lastNotifTime = useRef({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [camError, setCamError] = useState(false);
  const [current, setCurrent] = useState(0);
  const [aiStatus, setAiStatus] = useState('checking');
  const [sessionStats, setSessionStats] = useState(null);
  const [frameCount, setFrameCount] = useState(0);

  const goHome = () => nav(user.role === 'admin' ? '/admin' : '/dashboard');

  const addNotif = useCallback((msg, type = 'warn', severity = 'MEDIUM') => {
    const now = Date.now();
    const last = lastNotifTime.current[type] || 0;

    // ✅ Allow same type only once per 30 seconds — prevents spam
    if (now - last < 30000) return;
    lastNotifTime.current[type] = now;

    const n = { msg, type, severity, id: now, time: new Date().toLocaleTimeString() };
    // ✅ Always add newest to end, Notifications component sorts by id desc
    setNotifications(ns => [...ns, n].slice(-10));
  }, []);

  // Load exam + check AI + reset stats
  useEffect(() => {
    api.get(`/exam/${id}`)
      .then(r => { setExam(r.data); setTimeLeft(r.data.duration * 60); })
      .catch(() => goHome());

    api.get('/proctor/health')
      .then(r => setAiStatus(r.data.online ? 'online' : 'offline'))
      .catch(() => setAiStatus('offline'));

    api.post('/proctor/reset').catch(() => {});
  }, [id]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || submitted) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(tl => tl - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, submitted]);

  // ── AI Proctoring every 10s (Render needs more time than Colab) ──
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(async () => {
      if (!webcamRef.current) return;
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      try {
        // ✅ Compress image from ~200KB to ~15KB before sending
        const compressed = await compressImage(imageSrc, 0.4, 320);
        setFrameCount(f => f + 1);

        const { data } = await api.post('/proctor/analyze', {
          image: compressed,
          examId: id
        });

        if (data.error === 'AI offline') {
          setAiStatus('offline');
          return;
        }

        setAiStatus('online');

        if (data.violations && data.violations.length > 0) {
          data.violations.forEach(v => addNotif(v.message, v.type, v.severity));
        }

      } catch (err) {
        console.error('Proctoring error:', err.message);
        setAiStatus('offline');
      }
    }, 10000); // ✅ 10s interval — Render is slower than Colab

    return () => clearInterval(interval);
  }, [submitted, id, addNotif]);

  // Fetch session stats every 60s
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => {
      api.get('/proctor/stats').then(r => setSessionStats(r.data)).catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [submitted]);

  const handleSubmit = async () => {
    if (submitted) return;
    setSubmitted(true);
    try {
      const statsRes = await api.get('/proctor/stats');
      setSessionStats(statsRes.data);
    } catch {}
    try {
      const answerArr = exam.questions.map((_, i) => answers[i] ?? -1);
      const { data } = await api.post(`/exam/${id}/submit`, { answers: answerArr });
      const vRes = await api.get(`/proctor/violations/${id}`).catch(() => ({ data: [] }));
      setResult({ ...data, violations: vRes.data });
    } catch {
      setResult({ score: 0, total: exam?.questions?.length, percent: 0, violations: [] });
    }
  };

  if (!exam) return <div style={{ color: '#fff', padding: 40 }}>Loading exam...</div>;

  // Result Page
  if (result) return (
    <div style={S.resultPage}>
      <div style={S.resultCard}>
        <div style={S.resultIcon}>{result.percent >= 50 ? '🎉' : '📚'}</div>
        <h1 style={S.resultTitle}>Exam Complete</h1>
        <div style={S.scoreCircle}>{result.percent}%</div>
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
          Score: {result.score} / {result.total}
        </p>
        {result.violations && result.violations.length > 0 && (
          <div style={S.violSummary}>
            <p style={{ color: 'var(--warn)', fontWeight: 700, marginBottom: 8 }}>
              ⚠ {result.violations.length} violation(s) recorded
            </p>
            {result.violations.slice(0, 3).map((v, i) => (
              <div key={i} style={S.violItem}>
                <span style={{ ...S.sevBadge, background: severityColor(v.severity) }}>{v.severity}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{v.message}</span>
              </div>
            ))}
            {result.violations.length > 3 && (
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                +{result.violations.length - 3} more...
              </p>
            )}
          </div>
        )}
        <button style={S.homeBtn} onClick={goHome}>Back to Dashboard</button>
      </div>
    </div>
  );

  const q = exam.questions[current];
  const progress = ((current + 1) / exam.questions.length) * 100;

  return (
    <div style={S.page}>
      {/* Top Bar */}
      <div style={S.topBar}>
        <span style={S.examTitle}>{exam.title}</span>
        {timeLeft !== null && <Timer seconds={timeLeft} />}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={S.aiStatus}>
            <span style={{
              ...S.aiDot,
              background: aiStatus === 'online' ? 'var(--accent)' : aiStatus === 'offline' ? 'var(--danger)' : 'var(--warn)',
              animation: aiStatus === 'online' ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              AI {aiStatus === 'online' ? `Online (${frameCount} frames)` : aiStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>
          <button style={S.submitBtn} onClick={handleSubmit}>Submit Exam</button>
        </div>
      </div>

      {/* Progress */}
      <div style={S.progressBar}>
        <div style={{ ...S.progressFill, width: `${progress}%` }} />
      </div>

      <div style={S.body}>
        {/* Left Panel */}
        <div style={S.camPanel}>
          {camError ? (
            <div style={S.camError}>⚠️ Camera access denied.<br />Enable camera to continue.</div>
          ) : (
            <WebcamMonitor
              ref={webcamRef}
              onError={() => { setCamError(true); addNotif('Camera access denied!', 'no_camera', 'HIGH'); }}
              isActive={!submitted}
            />
          )}

          {/* Session Stats */}
          {sessionStats && (
            <div style={S.statsBox}>
              <div style={S.statsTitle}>📊 Session Stats</div>
              <div style={S.statsRow}><span>Frames sent</span><span>{frameCount}</span></div>
              <div style={S.statsRow}><span>AI processed</span><span>{sessionStats.total_frames}</span></div>
              <div style={S.statsRow}>
                <span>Violations</span>
                <span style={{ color: sessionStats.total_violations > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                  {sessionStats.total_violations}
                </span>
              </div>
              <div style={S.statsRow}><span>No face</span><span>{sessionStats.no_face_count}</span></div>
              <div style={S.statsRow}><span>Objects</span><span>{sessionStats.object_violations}</span></div>
            </div>
          )}

          <Notifications items={notifications} />
        </div>

        {/* Question Panel */}
        <div style={S.questionPanel}>
          <div style={S.qHeader}>Question {current + 1} of {exam.questions.length}</div>
          <div style={S.qText}>{q.question}</div>
          <div style={S.options}>
            {q.options.map((opt, i) => (
              <button key={i} style={{
                ...S.option,
                borderColor: answers[current] === i ? 'var(--accent)' : 'var(--border)',
                background: answers[current] === i ? '#00ff9d15' : 'var(--bg)',
                color: answers[current] === i ? 'var(--accent)' : 'var(--text)',
              }} onClick={() => setAnswers({ ...answers, [current]: i })}>
                <span style={S.optLetter}>{String.fromCharCode(65 + i)}</span>
                {opt}
              </button>
            ))}
          </div>
          <div style={S.nav}>
            <button style={S.navBtn} disabled={current === 0}
              onClick={() => setCurrent(c => c - 1)}>← Prev</button>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
              {exam.questions.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} style={{
                  ...S.dot2,
                  background: answers[i] !== undefined ? 'var(--accent)' : i === current ? 'var(--accent2)' : 'var(--border)',
                }} />
              ))}
            </div>
            {current < exam.questions.length - 1
              ? <button style={S.navBtn} onClick={() => setCurrent(c => c + 1)}>Next →</button>
              : <button style={{ ...S.navBtn, background: 'var(--accent)', color: '#000' }} onClick={handleSubmit}>Submit</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

const severityColor = (s) => ({
  LOW: '#22c55e40', MEDIUM: '#ffaa0040', HIGH: '#ff444440', CRITICAL: '#ff000060'
}[s] || '#ffaa0040');

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  examTitle: { fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--text)' },
  aiStatus: { display: 'flex', alignItems: 'center', gap: 6 },
  aiDot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  submitBtn: { background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 6,
    padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  progressBar: { height: 3, background: 'var(--border)' },
  progressFill: { height: '100%', background: 'var(--accent)', transition: 'width .3s' },
  body: { display: 'flex', flex: 1 },
  camPanel: { width: 300, borderRight: '1px solid var(--border)', padding: 20,
    display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--surface)', overflowY: 'auto' },
  camError: { background: '#ff44441a', border: '1px solid var(--danger)', borderRadius: 8,
    padding: 16, color: 'var(--danger)', fontSize: 13, textAlign: 'center' },
  statsBox: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 },
  statsTitle: { fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 },
  statsRow: { display: 'flex', justifyContent: 'space-between', fontSize: 12,
    color: 'var(--text)', padding: '3px 0', borderBottom: '1px solid var(--border)' },
  questionPanel: { flex: 1, padding: '32px 40px' },
  qHeader: { fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--accent)', marginBottom: 16 },
  qText: { fontSize: 20, fontWeight: 600, marginBottom: 28, lineHeight: 1.5 },
  options: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 },
  option: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
    border: '1px solid', borderRadius: 10, fontSize: 15, textAlign: 'left',
    transition: 'all .15s', fontFamily: 'var(--font)', cursor: 'pointer' },
  optLetter: { width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
    fontWeight: 700, flexShrink: 0 },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 8, padding: '10px 20px', fontSize: 14, fontFamily: 'var(--font)', cursor: 'pointer' },
  dot2: { width: 12, height: 12, borderRadius: '50%', border: 'none', cursor: 'pointer', transition: 'background .2s' },
  resultPage: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 0%, #0a1a0a 0%, #0a0a0f 60%)' },
  resultCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '48px 40px', textAlign: 'center', maxWidth: 420, width: '100%' },
  resultIcon: { fontSize: 56, marginBottom: 16 },
  resultTitle: { fontFamily: 'var(--mono)', fontSize: 22, marginBottom: 24 },
  scoreCircle: { fontSize: 52, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: 8 },
  violSummary: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: 14, marginBottom: 20, textAlign: 'left' },
  violItem: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
  sevBadge: { fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' },
  homeBtn: { background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 8,
    padding: '12px 32px', fontWeight: 700, fontSize: 15, fontFamily: 'var(--font)', cursor: 'pointer' },
};