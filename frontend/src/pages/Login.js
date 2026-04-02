import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const { data } = await api.post(endpoint, form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav('/dashboard');
    } catch (e) {
      setErr(e.response?.data?.message || 'Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>⬡</div>
        <h1 style={S.title}>ExamGuard</h1>
        <p style={S.sub}>AI-Powered Proctoring System</p>

        <form onSubmit={handle} style={S.form}>
          {isRegister && (
            <input style={S.input} placeholder="Full Name" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          )}
          <input style={S.input} placeholder="Email" type="email" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input style={S.input} placeholder="Password" type="password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required />
          {isRegister && (
            <select style={S.input} value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          )}
          {err && <p style={S.err}>{err}</p>}
          <button style={S.btn} disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p style={S.toggle}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={S.link} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Sign In' : 'Register'}
          </span>
        </p>
      </div>
    </div>
  );
}

const S = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at 50% 0%, #1a0a2e 0%, #0a0a0f 60%)' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
    padding: '40px 36px', width: '100%', maxWidth: 400, textAlign: 'center' },
  logo: { fontSize: 48, color: 'var(--accent)', marginBottom: 8 },
  title: { fontFamily: 'var(--mono)', fontSize: 24, color: 'var(--text)', marginBottom: 4 },
  sub: { color: 'var(--muted)', fontSize: 13, marginBottom: 28 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '12px 14px', color: 'var(--text)', fontSize: 14, outline: 'none',
    fontFamily: 'var(--font)' },
  btn: { background: 'var(--accent)', color: '#0a0a0f', fontWeight: 700, fontSize: 15,
    border: 'none', borderRadius: 8, padding: '13px', marginTop: 4,
    fontFamily: 'var(--font)', transition: 'opacity .2s' },
  err: { color: 'var(--danger)', fontSize: 13 },
  toggle: { marginTop: 20, fontSize: 13, color: 'var(--muted)' },
  link: { color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 },
};
