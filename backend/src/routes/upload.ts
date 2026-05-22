import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { asyncHandler, badRequest } from '../middleware/errorHandler';
import { requireString, requireEnum } from '../utils/validate';

const router = Router();

// Khoi tao S3 client mot lan (dung credentials tu EC2 instance profile khi chay prod,
// hoac AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY khi chay local)
const s3 = new S3Client({ region: env.S3_IMAGES_REGION });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const EXT_BY_MIME: Record<(typeof ALLOWED_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};

// POST /api/upload/presign
// Body: { filename: string, contentType: 'image/jpeg' | 'image/png' | 'image/webp' }
// Tra ve presigned URL de FE upload truc tiep len S3 + URL public (qua CloudFront) de luu vao DB.
router.post(
  '/presign',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!env.S3_IMAGES_BUCKET || !env.CDN_IMAGES_URL) {
      throw badRequest('S3 image storage not configured');
    }

    const filename = requireString(req.body?.filename, 'filename', 255);
    const contentType = requireEnum(req.body?.contentType, ALLOWED_TYPES, 'contentType');

    // Key: products/<uuid>.<ext>  -> tranh ten file dung trung lap
    const ext = EXT_BY_MIME[contentType];
    const key = `products/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: env.S3_IMAGES_BUCKET,
      Key: key,
      ContentType: contentType,
      // Metadata giu lai ten file goc de debug — khong duoc dung tren UI
      Metadata: { 'original-filename': encodeURIComponent(filename) },
    });

    // URL co han 5 phut — du de FE upload xong file
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `${env.CDN_IMAGES_URL.replace(/\/$/, '')}/${key}`;

    res.json({ uploadUrl, publicUrl, key });
  })
);

export default router;
