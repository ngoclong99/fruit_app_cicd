import { apiService } from '../../services/api/apiService';

export interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

function isAllowedMime(t: string): t is AllowedMime {
  return (ALLOWED_MIME as readonly string[]).includes(t);
}

export const uploadsApi = {
  presign: (filename: string, contentType: AllowedMime) =>
    apiService.post<PresignResponse>('/api/upload/presign', { filename, contentType }),
};

// Upload mot image len S3 qua presigned URL.
// 1. Goi BE de lay presigned PUT URL
// 2. PUT file truc tiep len S3 (khong qua BE -> tiet kiem RAM/CPU EC2)
// 3. Tra ve publicUrl (CloudFront) de luu vao DB
export async function uploadImage(file: File): Promise<string> {
  if (!isAllowedMime(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}. Allowed: JPG, PNG, WEBP`);
  }
  // 10MB limit — du cho anh san pham, tranh abuse
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Image too large (max 10MB)');
  }

  const { uploadUrl, publicUrl } = await uploadsApi.presign(file.name, file.type);

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!putRes.ok) {
    throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
  }

  return publicUrl;
}
