import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { io } from 'socket.io-client';
import { BACKEND } from '../api';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    Promise.all([
      api.get('/exam'),
      api.get('/violations/mine')
    ]).then(([eRes, vRes]) => {
      setExams(eRes.data);
      setViolations(vRes.data);
    }).finally(() => setLoading(false));

    const socket = io(BACKEND);
    socket.on('violation_alert', (data) => {
      if (data.studentId === user.id)
        setAlerts(a => [{ ...data, time: new Date().toLocaleTimeString() }, ...a].slice(0, 3));
    });
    return () => socket.disconnect();
  }, []);

  const logout = () => { localStorage.clear(); nav('/login'); };

  const sevColor = (s) => ({ LOW: '#22c55e', MEDIUM: '#ffaa00', HIGH: '#ff6b35', CRITICAL: '#ff4444' }[s] || '#ffaa00');

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.brand}>⬡ ExamGuard</div>
        <div style={S.headerRight}>
          <div style={S.userChip}>
            <span style={S.avatar}>{user.name?.[0]?.toUpperCase()}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Student</div>
            </div>
          </div>
          <button style={S.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={S.body}>
        {/* Live Alert Banner */}
        {alerts.length > 0 && (
          <div style={S.alertBanner}>
            🚨 {alerts[0].violations?.[0]?.message || 'Violation detected'} — {alerts[0].time}
          </div>
        )}

        {/* Welcome */}
        <div style={S.welcome}>
          <h1 style={S.welcomeTitle}>Welcome back, {user.name?.split(' ')[0]}! 👋</h1>
          <p style={S.welcomeSub}>You have {exams.length} exam(s) available</p>
        </div>

        <div style={S.grid}>
          {/* Available Exams */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>📝 Available Exams</h2>
              <span style={S.count}>{exams.length}</span>
            </div>

            {loading ? (
              <div style={S.empty}>Loading exams...</div>
            ) : exams.length === 0 ? (
              <div style={S.empty}>No exams available yet.<br/>Check back later!</div>
            ) : exams.map(exam => (
              <div key={exam._id} style={S.examCard}>
                <div style={S.examInfo}>
                  <div style={S.examName}>{exam.title}</div>
                  <div style={S.examMeta}>
                    <span>⏱ {exam.duration} min</span>
                    <span>❓ {exam.questions?.length} questions</span>
                    {exam.createdBy && <span>👤 {exam.createdBy.name}</span>}
                  </div>
                </div>
                <button style={S.startBtn} onClick={() => nav(`/exam/${exam._id}`)}>
                  Start →
                </button>
              </div>
            ))}
          </div>

          {/* Violation History */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <h2 style={S.cardTitle}>⚠ My Violation Log</h2>
              <span style={{ ...S.count, background: violations.length > 0 ? '#ff444420' : '#00ff9d20',
                color: violations.length > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                {violations.length}
              </span>
            </div>

            {violations.length === 0 ? (
              <div style={S.empty}>✅ No violations recorded.<br/>Keep it up!</div>
            ) : violations.map((v, i) => (
              <div key={i} style={S.violRow}>
                <div style={{ ...S.sevDot, background: sevColor(v.severity) }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)' }}>{v.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(v.createdAt).toLocaleString()}
                  </div>
                </div>
                <span style={{ ...S.sevBadge, background: sevColor(v.severity) + '30',
                  color: sevColor(v.severity) }}>
                  {v.severity || 'MEDIUM'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 32px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  brand: { fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--accent)' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  userChip: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--accent2)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 16 },
  logoutBtn: { background: 'transparent', border: '1px solid var(--border)',
    color: 'var(--muted)', borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  body: { padding: '32px' },
  alertBanner: { background: '#ff44441a', border: '1px solid var(--danger)', borderRadius: 8,
    padding: '12px 16px', marginBottom: 24, color: 'var(--danger)', fontSize: 14, fontWeight: 600 },
  welcome: { marginBottom: 28 },
  welcomeTitle: { fontSize: 26, fontWeight: 700, marginBottom: 4 },
  welcomeSub: { color: 'var(--muted)', fontSize: 15 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontFamily: 'var(--mono)', fontSize: 15, color: 'var(--text)' },
  count: { background: '#ffffff10', color: 'var(--muted)', fontSize: 12, fontWeight: 700,
    padding: '3px 10px', borderRadius: 20 },
  empty: { color: 'var(--muted)', fontSize: 14, textAlign: 'center', padding: '24px 0', lineHeight: 1.8 },
  examCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, background: 'var(--bg)', borderRadius: 8, marginBottom: 10,
    border: '1px solid var(--border)', transition: 'border-color .2s' },
  examInfo: { flex: 1 },
  examName: { fontWeight: 600, marginBottom: 6, fontSize: 15 },
  examMeta: { display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 12 },
  startBtn: { background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 6,
    padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' },
  violRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
    borderBottom: '1px solid var(--border)' },
  sevDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  sevBadge: { fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700 },
};
