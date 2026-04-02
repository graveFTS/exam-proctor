import axios from 'axios';

export const BACKEND = 'http://localhost:5000';

// ⚠️ After running Google Colab, paste your ngrok URL here:
export const COLAB_API = 'https://fan-howard-lawrence-factor.trycloudflare.com';

const api = axios.create({ baseURL: BACKEND + '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
