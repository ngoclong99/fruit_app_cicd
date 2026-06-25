// =============================================================================
// api/client.ts — Axios instance dùng chung cho mọi gọi API
// =============================================================================
// Khác biệt với web:
//   - Web: dùng localStorage (đồng bộ). RN: AsyncStorage (await).
//   - RN: baseURL PHẢI là URL tuyệt đối (http://...). Android emulator dùng
//         10.0.2.2 thay cho localhost. Xem app.json `extra.apiUrl`.
// =============================================================================

import axios, { type InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { ApiError, getApiErrorMessage } from '@/shared/errors/errorCodes';
import { tokenStorage } from '@/shared/storage/tokenStorage';

const extraApiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? '';
const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? extraApiUrl ?? '').trim();
// Strip trailing /api để tránh /api/api/... khi mỗi endpoint đã có sẵn /api/...
const baseURL = rawApiUrl.replace(/\/api\/?$/, '');

export const apiBaseUrl = baseURL;

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request: tự đính access token (đọc qua tokenStorage — đồng bộ key với toàn app).
api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenStorage.getToken();
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch {
    // AsyncStorage lỗi — vẫn gọi API không token
  }
  return config;
});

// ─── Auto-refresh access token ──────────────────────────────────────────────
// Access token sống ~15'. Hết hạn (401) → dùng refresh token đổi token mới rồi
// thử lại request. Single-flight + axios trần để tránh đệ quy.
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const rt = await tokenStorage.getRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const res = await axios.post(
    `${baseURL}/api/auth/refresh`,
    { refreshToken: rt },
    { headers: { 'Content-Type': 'application/json' } },
  );
  // Envelope { data: { token, refreshToken } }. Refresh token được XOAY VÒNG →
  // phải lưu cái mới (token cũ đã bị thu hồi, dùng lại sẽ bị cắt phiên).
  const data = res.data?.data as { token?: string; refreshToken?: string } | undefined;
  if (!data?.token) throw new Error('Refresh failed');
  await tokenStorage.setToken(data.token);
  if (data.refreshToken) await tokenStorage.setRefreshToken(data.refreshToken);
  return data.token;
}

function getRefreshedToken(): Promise<string> {
  if (!refreshing) refreshing = refreshAccessToken().finally(() => { refreshing = null; });
  return refreshing;
}

// Response: bóc envelope (2xx) + auto-refresh (401) + chuẩn hoá lỗi.
api.interceptors.response.use(
  (response) => {
    // Bóc envelope { code:number, message, data } — yêu cầu code là SỐ + có message
    // để không nhầm payload thường có field 'code'/'data'.
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
    const status: number | undefined = error?.response?.status;
    const data = error?.response?.data as { error?: string; message?: string } | undefined;
    const original = (error?.config ?? {}) as InternalAxiosRequestConfig & { _retry?: boolean };
    const url: string = original.url ?? '';

    const isAuthEndpoint = url.includes('/auth/');
    const skipRefresh = isAuthEndpoint && !url.includes('/auth/me');

    if (status === 401 && !skipRefresh && !original._retry) {
      try {
        await getRefreshedToken();
        original._retry = true;
        return api(original); // request interceptor đính token mới
      } catch {
        // Refresh thất bại → xoá phiên. Màn hình sẽ điều hướng về login khi cần.
        await tokenStorage.clear();
      }
    }

    const message = getApiErrorMessage(data?.error, data?.message ?? error?.message);
    return Promise.reject(new ApiError(message, { code: data?.error, status }));
  },
);

export default api;
