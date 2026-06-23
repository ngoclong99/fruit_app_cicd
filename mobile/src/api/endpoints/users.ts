import api from '@/api/client';
import type { User } from '@/types';

export const usersApi = {
  get: (id: string) => api.get<User>(`/api/users/${id}`).then((r) => r.data),
  update: (id: string, data: Partial<User>) =>
    api.patch<User>(`/api/users/${id}`, data).then((r) => r.data),
};
