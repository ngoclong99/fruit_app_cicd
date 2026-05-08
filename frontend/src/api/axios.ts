import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    if (status === 403 && !isAuthEndpoint) {
      window.location.href = '/';
    }
    const message =
      error.response?.data?.message ?? error.message ?? 'Unknown error';
    return Promise.reject(new Error(message));
  }
);

export default api;
