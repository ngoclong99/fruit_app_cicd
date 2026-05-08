import api from '../../api/axios';

export const apiService = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    api.get<T>(url, { params }).then((r) => r.data),

  post: <T>(url: string, data?: unknown) =>
    api.post<T>(url, data).then((r) => r.data),

  put: <T>(url: string, data?: unknown) =>
    api.put<T>(url, data).then((r) => r.data),

  patch: <T>(url: string, data?: unknown) =>
    api.patch<T>(url, data).then((r) => r.data),

  delete: <T>(url: string) =>
    api.delete<T>(url).then((r) => r.data),
};
