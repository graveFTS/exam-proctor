import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const EMPTY_QUESTION = { question: '', options: ['', '', '', ''], answer: 0 };
const EMPTY_EXAM = { title: '', duration: 30, questions: [{ ...EMPTY_QUESTION }] };

export default function AdminDashboard() {
  const [exams, setExams] = useState([]);
  const [violations, setViolations] = useState([]);
  const [view, setView] = useState('exams'); // 'exams' | 'create' | 'edit' | 'violations'
  const [form, setForm] = useState(EMPTY_EXAM);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [eRes, vRes] = await Promise.all([
      api.get('/exam').catch(() => ({ data: [] })),
      api.get('/violations/all').catch(() => ({ data: [] })),
    ]);
    setExams(eRes.data);
    setViolations(vRes.data);
  };

  const logout = () => { localStorage.clear(); nav('/login'); };

  // ── Question helpers ──
  const setQuestion = (qi, field, val) => {
    const qs = [...form.questions];
    qs[qi] = { ...qs[qi], [field]: val };
    setForm({ ...form, questions: qs });
  };

  const setOption = (qi, oi, val) => {
    const qs = [...form.questions];
    const opts = [...qs[qi].options];
    opts[oi] = val;
    qs[qi] = { ...qs[qi], options: opts };
    setForm({ ...form, questions: qs });
  };

  const addQuestion = () =>
    setForm({ ...form, questions: [...form.questions, { ...EMPTY_QUESTION, options: ['', '', '', ''] }] });

  const removeQuestion = (qi) =>
    setForm({ ...form, questions: form.questions.filter((_, i) => i !== qi) });

  // ── Save exam ──
  const saveExam = async () => {
    if (!form.title.trim()) return setMsg('❌ Exam title is required');
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.question.trim()) return setMsg(`❌ Question ${i + 1} text is empty`);
      if (q.options.some(o => !o.trim())) return setMsg(`❌ All options in Q${i + 1} must be filled`);
    }
    setSaving(true); setMsg('');
    try {
      if (editId) {
        await api.put(`/exam/${editId}`, form);
        setMsg('✅ Exam updated!');
      } else {
        await api.post('/exam', form);
        setMsg('✅ Exam created!');
      }
      await loadData();
      setTimeout(() => { setView('exams'); setForm(EMPTY_EXAM); setEditId(null); setMsg(''); }, 1200);
    } catch (e) {
      setMsg('❌ ' + (e.response?.data?.message || 'Failed to save'));
    }
    setSaving(false);
  };

  const deleteExam = async (id) => {
    if (!window.confirm('Delete this exam?')) return;
    await api.delete(`/exam/${id}`).catch(() => {});
    loadData();
  };

  const startEdit = (exam) => {
    setForm({ title: exam.title, duration: exam.duration, questions: exam.questions });
    setEditId(exam._id);
    setView('create');
  };

  const sevColor = (s) => ({ LOW: '#22c55e', MEDIUM: '#ffaa00', HIGH: '#ff6b35', CRITICAL: '#ff4444' }[s] || '#ffaa00');

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={S.brand}>⬡ ExamGuard <span style={S.adminTag}>ADMIN</span></div>
        <div style={S.nav}>
          {[['exams','📋 Exams'], ['violations','⚠ Violations']].map(([v, label]) => (
            <button key={v} style={{ ...S.navBtn, borderBottom: view === v ? '2px solid var(--accent)' : '2px solid transparent',
              color: view === v ? 'var(--accent)' : 'var(--muted)' }} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{user.name}</span>
          <button style={S.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={S.body}>

        {/* ── EXAMS VIEW ── */}
        {view === 'exams' && (
          <div>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.pageTitle}>My Exams</h1>
                <p style={S.pageSub}>{exams.length} exam(s) created by you</p>
              </div>
              <button style={S.createBtn} onClick={() => { setForm(EMPTY_EXAM); setEditId(null); setView('create'); }}>
                + Create New Exam
              </button>
            </div>

            {exams.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
                <h3 style={{ marginBottom: 8 }}>No exams yet</h3>
                <p style={{ color: 'var(--muted)', marginBottom: 20 }}>Create your first exam for students</p>
                <button style={S.createBtn} onClick={() => setView('create')}>+ Create Exam</button>
              </div>
            ) : (
              <div style={S.examGrid}>
                {exams.map(exam => (
                  <div key={exam._id} style={S.examCard}>
                    <div style={S.examCardTop}>
                      <h3 style={S.examTitle}>{exam.title}</h3>
                      <div style={S.examBadge}>⏱ {exam.duration} min</div>
                    </div>
                    <p style={S.examMeta}>❓ {exam.questions?.length} questions</p>
                    <p style={{ ...S.examMeta, marginBottom: 16 }}>
                      📅 {new Date(exam.createdAt).toLocaleDateString()}
                    </p>
                    <div style={S.examActions}>
                      <button style={S.editBtn} onClick={() => startEdit(exam)}>✏️ Edit</button>
                      <button style={S.deleteBtn} onClick={() => deleteExam(exam._id)}>🗑 Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE / EDIT EXAM VIEW ── */}
        {view === 'create' && (
          <div style={S.formWrap}>
            <div style={S.formHeader}>
              <button style={S.backBtn} onClick={() => { setView('exams'); setMsg(''); }}>← Back</button>
              <h2 style={S.pageTitle}>{editId ? 'Edit Exam' : 'Create New Exam'}</h2>
            </div>

            {/* Exam details */}
            <div style={S.formCard}>
              <h3 style={S.sectionTitle}>Exam Details</h3>
              <div style={S.row}>
                <div style={{ flex: 2 }}>
                  <label style={S.label}>Exam Title *</label>
                  <input style={S.input} placeholder="e.g. Computer Science Midterm"
                    value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Duration (minutes)</label>
                  <input style={S.input} type="number" min="5" max="180"
                    value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* Questions */}
            {form.questions.map((q, qi) => (
              <div key={qi} style={S.formCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={S.sectionTitle}>Question {qi + 1}</h3>
                  {form.questions.length > 1 && (
                    <button style={S.removeBtn} onClick={() => removeQuestion(qi)}>✕ Remove</button>
                  )}
                </div>

                <label style={S.label}>Question Text *</label>
                <textarea style={S.textarea} placeholder="Enter your question here..."
                  value={q.question} onChange={e => setQuestion(qi, 'question', e.target.value)} />

                <label style={S.label}>Answer Options * <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(select correct answer)</span></label>
                <div style={S.optionsGrid}>
                  {q.options.map((opt, oi) => (
                    <div key={oi} style={{ ...S.optionRow, borderColor: q.answer === oi ? 'var(--accent)' : 'var(--border)',
                      background: q.answer === oi ? '#00ff9d08' : 'var(--bg)' }}>
                      <button style={{ ...S.radioBtn, borderColor: q.answer === oi ? 'var(--accent)' : 'var(--border)',
                        background: q.answer === oi ? 'var(--accent)' : 'transparent' }}
                        onClick={() => setQuestion(qi, 'answer', oi)}
                        title="Mark as correct answer">
                        {q.answer === oi && <span style={S.radioDot} />}
                      </button>
                      <span style={{ ...S.optLabel, color: q.answer === oi ? 'var(--accent)' : 'var(--muted)' }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <input style={S.optInput} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        value={opt} onChange={e => setOption(qi, oi, e.target.value)} />
                      {q.answer === oi && <span style={S.correctTag}>✓ Correct</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Add question + Save */}
            <div style={S.formFooter}>
              <button style={S.addQBtn} onClick={addQuestion}>+ Add Question</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? 'var(--accent)' : 'var(--danger)' }}>{msg}</span>}
                <button style={S.saveBtn} onClick={saveExam} disabled={saving}>
                  {saving ? 'Saving...' : editId ? '💾 Update Exam' : '🚀 Publish Exam'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── VIOLATIONS VIEW ── */}
        {view === 'violations' && (
          <div>
            <div style={S.pageHeader}>
              <div>
                <h1 style={S.pageTitle}>Violation Monitor</h1>
                <p style={S.pageSub}>{violations.length} total violations across all students</p>
              </div>
            </div>

            {violations.length === 0 ? (
              <div style={S.emptyState}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3>No violations recorded</h3>
              </div>
            ) : (
              <div style={S.table}>
                <div style={S.tableHead}>
                  <span>Student</span><span>Type</span><span>Message</span><span>Severity</span><span>Time</span>
                </div>
                {violations.map((v, i) => (
                  <div key={i} style={{ ...S.tableRow, background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{v.student?.name || 'Unknown'}</span>
                    <span style={S.typeTag}>{v.type?.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{v.message}</span>
                    <span style={{ ...S.sevBadge, background: sevColor(v.severity) + '25',
                      color: sevColor(v.severity) }}>{v.severity || 'MEDIUM'}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 32px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' },
  brand: { fontFamily: 'var(--mono)', fontSize: 20, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 },
  adminTag: { fontSize: 10, background: 'var(--accent2)', color: '#fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 },
  nav: { display: 'flex', gap: 4 },
  navBtn: { background: 'transparent', border: 'none', padding: '8px 16px', fontSize: 14,
    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'color .2s' },
  logoutBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
    borderRadius: 6, padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  body: { padding: '32px', maxWidth: 1100, margin: '0 auto' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  pageTitle: { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  pageSub: { color: 'var(--muted)', fontSize: 14 },
  createBtn: { background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 8,
    padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  emptyState: { textAlign: 'center', padding: '60px 20px', background: 'var(--surface)',
    border: '1px solid var(--border)', borderRadius: 12 },
  examGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  examCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 },
  examCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  examTitle: { fontSize: 16, fontWeight: 700, flex: 1, marginRight: 8 },
  examBadge: { background: 'var(--accent2)20', color: 'var(--accent2)', fontSize: 12,
    padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' },
  examMeta: { color: 'var(--muted)', fontSize: 13, marginBottom: 4 },
  examActions: { display: 'flex', gap: 8, marginTop: 12 },
  editBtn: { flex: 1, background: 'var(--accent2)20', color: 'var(--accent2)', border: '1px solid var(--accent2)40',
    borderRadius: 6, padding: '7px', fontSize: 13, cursor: 'pointer' },
  deleteBtn: { flex: 1, background: '#ff444415', color: 'var(--danger)', border: '1px solid #ff444430',
    borderRadius: 6, padding: '7px', fontSize: 13, cursor: 'pointer' },
  formWrap: { maxWidth: 780, margin: '0 auto' },
  formHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  backBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
    borderRadius: 6, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },
  formCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
    padding: 24, marginBottom: 16 },
  sectionTitle: { fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--accent)', marginBottom: 16 },
  row: { display: 'flex', gap: 16 },
  label: { display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6, fontWeight: 600 },
  input: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
    boxSizing: 'border-box' },
  textarea: { width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '10px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)',
    minHeight: 80, resize: 'vertical', marginBottom: 16, boxSizing: 'border-box' },
  optionsGrid: { display: 'flex', flexDirection: 'column', gap: 8 },
  optionRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    border: '1px solid', borderRadius: 8, transition: 'all .15s' },
  radioBtn: { width: 20, height: 20, borderRadius: '50%', border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0, background: 'transparent' },
  radioDot: { width: 8, height: 8, borderRadius: '50%', background: '#0a0a0f' },
  optLabel: { fontWeight: 700, fontSize: 14, width: 20, flexShrink: 0 },
  optInput: { flex: 1, background: 'transparent', border: 'none', color: 'var(--text)',
    fontSize: 14, outline: 'none', fontFamily: 'var(--font)' },
  correctTag: { fontSize: 11, color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' },
  removeBtn: { background: '#ff444415', color: 'var(--danger)', border: '1px solid #ff444430',
    borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
  formFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 0' },
  addQBtn: { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    borderRadius: 8, padding: '10px 18px', fontSize: 14, cursor: 'pointer' },
  saveBtn: { background: 'var(--accent)', color: '#0a0a0f', border: 'none', borderRadius: 8,
    padding: '10px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  table: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 2fr 1fr 1.5fr',
    padding: '12px 20px', background: 'var(--border)', fontSize: 12, fontWeight: 700,
    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 2fr 1fr 1.5fr',
    padding: '12px 20px', alignItems: 'center', borderBottom: '1px solid var(--border)' },
  typeTag: { fontSize: 12, background: '#ffffff10', padding: '2px 8px', borderRadius: 20,
    textTransform: 'capitalize', color: 'var(--text)' },
  sevBadge: { fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
    display: 'inline-block', textAlign: 'center' },
};
