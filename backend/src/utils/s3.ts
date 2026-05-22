import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { logger } from '../config/logger';

export const s3 = new S3Client({ region: env.S3_IMAGES_REGION });

// Extract S3 key tu URL CloudFront/S3. Tra null neu URL khong thuoc bucket cua minh
// (vd anh unsplash cu, anh tu ben thu 3).
export function extractS3Key(url: string | null | undefined): string | null {
  if (!url || !env.CDN_IMAGES_URL) return null;
  const cdnBase = env.CDN_IMAGES_URL.replace(/\/$/, '');
  if (!url.startsWith(`${cdnBase}/`)) return null;
  const key = url.slice(cdnBase.length + 1);
  // Sanity check: key phai bat dau bang products/ va khong co ../
  if (!key.startsWith('products/') || key.includes('..')) return null;
  return key;
}

// Best-effort delete — log loi nhung khong throw. Du loi van OK vi:
//  1. Lifecycle rule co the don dep sau (neu cau hinh)
//  2. Khong nen reject API call khi cleanup S3 fail
export async function deleteFromS3(url: string | null | undefined): Promise<void> {
  const key = extractS3Key(url);
  if (!key) return;
  if (!env.S3_IMAGES_BUCKET) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: env.S3_IMAGES_BUCKET, Key: key }));
    logger.info({ key }, 'S3 object deleted');
  } catch (err) {
    logger.warn({ err, key }, 'Failed to delete S3 object (best-effort)');
  }
}

// Xoa nhieu URL song song. Bo qua URL khong thuoc bucket.
export async function deleteManyFromS3(urls: (string | null | undefined)[]): Promise<void> {
  await Promise.all(urls.map(deleteFromS3));
}
