// =============================================================================
// api/client.ts — Axios instance dùng chung cho mọi gọi API
// =============================================================================
// Khác biệt với web:
//   - Web: dùng localStorage (đồng bộ).
//   - RN: dùng AsyncStorage (BẤT đồng bộ → phải await).
//   - Web: baseURL thường là '' hoặc cùng origin (cookie session, /api).
//   - RN: PHẢI là URL tuyệt đối (http://...) vì app không có "origin".
//         Trên Android emulator, "localhost" là chính emulator -> không thấy
//         backend trên máy host. Phải dùng 10.0.2.2 (alias Android cho host)
//         hoặc IP LAN. Xem app.json `extra.apiUrl`.
// =============================================================================

import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Đọc URL backend từ 2 nguồn (ưu tiên env nếu có):
//   1) EXPO_PUBLIC_API_URL — biến môi trường (ví dụ trong .env)
//   2) app.json -> expo.extra.apiUrl — cấu hình tĩnh
const extraApiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? '';

const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? extraApiUrl ?? '').trim();

// Strip trailing /api để tránh /api/api/... khi mỗi endpoint đã có sẵn /api/...
const baseURL = rawApiUrl.replace(/\/api\/?$/, '');

export const apiBaseUrl = baseURL;

const api = axios.create({
  baseURL,
  timeout: 15000, // 15s — mobile mạng kém nên để lâu hơn web (web thường 10s)
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor request: tự đính token Bearer vào mọi request.
// Khác web: phải await AsyncStorage (async), nên interceptor là async function.
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch {
    // AsyncStorage có thể lỗi (storage đầy, etc.) — bỏ qua, vẫn gọi API không token
  }
  return config;
});

// Interceptor response: bóc lỗi để mọi nơi nhận Error có .message dễ hiểu.
// (Khác web: KHÔNG redirect window.location khi 401 — RN không có window.
// Việc xử lý 401 sẽ để mỗi screen tự gọi logout() nếu cần.)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ??
      error?.message ??
      'Đã xảy ra lỗi khi kết nối máy chủ';
    return Promise.reject(new Error(message));
  },
);

export default api;
