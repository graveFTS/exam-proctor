import axios from 'axios';

// ✅ Use Render backend URL in production, localhost in development
export const BACKEND = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: BACKEND + '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
