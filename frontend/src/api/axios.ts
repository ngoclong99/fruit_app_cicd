import axios from 'axios';

// Endpoints (api/endpoints/*.ts) da co prefix /api/... san
// -> baseURL phai KHONG bao gom /api (tranh /api/api/...)
// VITE_API_URL co the la: '' | '/api' | 'https://host' | 'https://host/api'
// -> Strip trailing /api de chuan hoa
const rawApiUrl = (import.meta.env.VITE_API_URL ?? '') as string;
const baseURL = rawApiUrl.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL,
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
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/change-password');
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
