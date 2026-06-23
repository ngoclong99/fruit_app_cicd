import axios, { type InternalAxiosRequestConfig } from 'axios';
import { ApiError, getApiErrorMessage, showErrorAlert } from '@/shared/errors/apiError';

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

// ─── Auto-refresh access token ──────────────────────────────────────────────
// Access token chỉ sống ~15'. Khi hết hạn (401), dùng refresh token đổi token mới
// rồi tự thử lại request. Dùng axios "trần" (không qua interceptor này) để tránh
// đệ quy + vòng import. Single-flight: nhiều request 401 cùng lúc chỉ refresh 1 lần.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const res = await axios.post(
    `${baseURL}/api/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  );
  // Response bọc envelope { code, message, data: { token, refreshToken } }.
  // Refresh token ĐƯỢC XOAY VÒNG → phải lưu cái mới, nếu không lần refresh sau
  // sẽ gửi token cũ (đã thu hồi) và bị reuse-detection cắt hết phiên.
  const data = res.data?.data as { token?: string; refreshToken?: string } | undefined;
  if (!data?.token) throw new Error('Refresh failed');
  localStorage.setItem('token', data.token);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  return data.token;
}

function getRefreshedToken(): Promise<string> {
  if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
  return refreshing;
}

function hardLogout(): void {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  window.location.href = '/';
}

// Response interceptor = BỘ KIỂM TRA TRUNG TÂM cho mọi API.
//   - 2xx  : bóc envelope → trả thẳng data cho apiService/component.
//   - 401  : thử auto-refresh token rồi retry; thất bại → đăng xuất.
//   - !2xx : chuẩn hoá thành ApiError + tự bật alert lỗi toàn cục.
api.interceptors.response.use(
  (response) => {
    // Bóc envelope { code:number, message, data }. Yêu cầu code là SỐ + có message
    // để không nhầm với payload thường tình cờ có field 'code'/'data'.
    const body = response.data;
    if (
      body && typeof body === 'object' &&
      typeof (body as { code?: unknown }).code === 'number' &&
      'message' in body && 'data' in body
    ) {
      response.data = (body as { data: unknown }).data;
    }
    return response;
  },
  async (error) => {
    const status: number | undefined = error.response?.status;
    const data = error.response?.data as
      | { error?: string; message?: string; details?: unknown }
      | undefined;
    const original = (error.config ?? {}) as InternalAxiosRequestConfig & { _retry?: boolean };
    const url: string = original.url ?? '';

    // Endpoint auth tự xử lý lỗi (inline) hoặc chạy nền → không alert toàn cục.
    const isAuthEndpoint = url.includes('/auth/');
    // Auto-refresh áp dụng cho request CÓ access token bị hết hạn. Hầu hết endpoint
    // /auth/* không cần (login/register/refresh/logout/mfa-verify không có token,
    // còn change-password/mfa-action 401 là do sai mật khẩu/mã) — TRỪ /auth/me
    // (cần auto-refresh để đồng bộ user lúc mở app).
    const skipRefresh = isAuthEndpoint && !url.includes('/auth/me');

    // 401 → access token có thể hết hạn: thử refresh 1 lần rồi retry.
    if (status === 401 && !skipRefresh && !original._retry) {
      if (localStorage.getItem('refreshToken')) {
        try {
          await getRefreshedToken();
          original._retry = true;
          // Không cần gắn header thủ công: request interceptor sẽ tự đính token
          // mới (đã lưu localStorage) khi retry.
          return api(original);
        } catch {
          hardLogout();
          return Promise.reject(
            new ApiError(getApiErrorMessage('UNAUTHORIZED'), { code: 'UNAUTHORIZED', status: 401 }),
          );
        }
      }
      hardLogout();
      return Promise.reject(
        new ApiError(getApiErrorMessage('UNAUTHORIZED'), { code: 'UNAUTHORIZED', status: 401 }),
      );
    }

    // 403 ngoài auth → không đủ quyền: về trang chủ (guard pathname tránh
    // reload-loop nếu chính trang chủ phát request bị 403).
    if (status === 403 && !isAuthEndpoint && window.location.pathname !== '/') {
      window.location.href = '/';
    }

    const message = getApiErrorMessage(data?.error, data?.message ?? error.message);
    const isRedirecting = status === 403 && !isAuthEndpoint;
    if (!isAuthEndpoint && !isRedirecting) showErrorAlert(message);
    // (endpoint /auth/* tự hiển thị lỗi inline tại form, nên bỏ qua alert toàn cục)

    return Promise.reject(
      new ApiError(message, { code: data?.error, status, details: data?.details }),
    );
  }
);

export default api;
