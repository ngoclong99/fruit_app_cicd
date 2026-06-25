import { apiService } from '@/services/api/apiService';
import api from '@/api/axios';

export interface PresignedPart {
  partNumber: number;
  url: string;
}
// create chỉ trả uploadId + ràng buộc S3; FE tự tính partSize/partCount.
export interface CreateMultipartResponse {
  key: string;
  uploadId: string;
  minPartSize: number;
  maxParts: number;
}
export interface CompletedPart {
  PartNumber: number;
  ETag: string;
}
export interface VideoObject {
  key: string;
  size: number;
  lastModified: string | null;
  viewUrl: string;
}

export const videosApi = {
  list: () => apiService.get<VideoObject[]>('/api/videos'),
  deleteVideo: (key: string) => apiService.post<{ message: string }>('/api/videos/delete', { key }),
  deleteManyVideos: (keys: string[]) =>
    apiService.post<{ deleted: number; errors: number }>('/api/videos/delete-many', { keys }),
  createMultipart: (filename: string, contentType: string, size: number) =>
    apiService.post<CreateMultipartResponse>('/api/videos/multipart/create', { filename, contentType, size }),
  // Ký URL cho các part FE yêu cầu (theo lô).
  signParts: (key: string, uploadId: string, partNumbers: number[]) =>
    apiService.post<{ urls: PresignedPart[] }>('/api/videos/multipart/sign', { key, uploadId, partNumbers }),
  completeMultipart: (key: string, uploadId: string, parts: CompletedPart[]) =>
    apiService.post<{ key: string; viewUrl: string }>('/api/videos/multipart/complete', { key, uploadId, parts }),
  abortMultipart: (key: string, uploadId: string) =>
    apiService.post<{ message: string }>('/api/videos/multipart/abort', { key, uploadId }),
  // withCredentials: để trình duyệt LƯU signed cookie CloudFront trả về (khi bật CDN).
  // Khi chưa bật CloudFront, response chỉ có { viewUrl } presigned S3 — credentials vô hại.
  viewUrl: (key: string) =>
    api
      .post<{ viewUrl: string }>(
        '/api/videos/view-url',
        { key },
        { withCredentials: true },
      )
      .then((r) => r.data),
};
