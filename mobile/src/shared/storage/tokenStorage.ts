import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Wrapper centralized cho việc lưu/đọc auth token + user info.
 * Mục đích:
 *   - Không rải `AsyncStorage.getItem('token')` khắp app
 *   - Đổi backend storage (vd SecureStore cho token) chỉ sửa 1 file
 *   - Type-safe — không phải JSON.parse tay rồi cast
 */

const TOKEN_KEY = '@fresh-mart/auth-token';
const REFRESH_KEY = '@fresh-mart/refresh-token';
const USER_KEY = '@fresh-mart/user';

export const tokenStorage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return AsyncStorage.getItem(REFRESH_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await AsyncStorage.setItem(REFRESH_KEY, token);
  },

  async getUser<T>(): Promise<T | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      // Corrupted data — clear it
      await AsyncStorage.removeItem(USER_KEY);
      return null;
    }
  },

  async setUser<T>(user: T): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  },
};
