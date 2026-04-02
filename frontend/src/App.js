import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ExamRoom from './pages/ExamRoom';

const styles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a0f;
    --surface: #13131a;
    --border: #1e1e2e;
    --accent: #00ff9d;
    --accent2: #7c3aed;
    --danger: #ff4444;
    --warn: #ffaa00;
    --text: #e8e8f0;
    --muted: #6b6b80;
    --font: 'DM Sans', sans-serif;
    --mono: 'Space Mono', monospace;
  }
  body { background: var(--bg); color: var(--text); font-family: var(--font); }
  button { cursor: pointer; font-family: var(--font); }
  input, textarea, select { font-family: var(--font); }
  a { color: inherit; text-decoration: none; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

// Redirect to correct dashboard based on role
const RoleRoute = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" />;
  return user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/dashboard" />;
};

// Only logged in users
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Only students
const StudentRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return children;
};

// Only admins
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

export default function App() {
  return (
    <>
      <style>{styles}</style>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Auto redirect based on role */}
          <Route path="/" element={<RoleRoute />} />

          {/* Student only */}
          <Route path="/dashboard" element={<StudentRoute><StudentDashboard /></StudentRoute>} />

          {/* Admin only */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Exam room - students only */}
          <Route path="/exam/:id" element={<StudentRoute><ExamRoom /></StudentRoute>} />

          {/* Catch all */}
          <Route path="*" element={<RoleRoute />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
