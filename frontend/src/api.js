import axios from 'axios';

export const BACKEND = 'https://exam-proctor-backend-nevz.onrender.com';

// ⚠️ After running Google Colab, paste your ngrok URL here:
export const AI_API = 'https://examguard-ai-h7ty.onrender.com';

const api = axios.create({ baseURL: BACKEND + '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
