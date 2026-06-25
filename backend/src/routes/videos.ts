import { Router, Response } from "express";
import { randomUUID } from "crypto";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/config/env";
import { s3 } from "@/utils/s3";
import { authenticate, AuthRequest } from "@/middleware/auth";
import { asyncHandler, badRequest, forbidden } from "@/middleware/errorHandler";
import { requireString } from "@/utils/validate";
import { cloudfrontEnabled, cdnUrl, signVideoCookies } from "@/utils/cloudfront";

const router = Router();

const VIDEO_COOKIE_TTL = 60 * 60; // 1h — FE tự xin lại (set cookie mới) khi bấm xem / hết hạn

// URL để xem 1 video:
//  • CloudFront bật → URL CDN "sạch" (không chữ ký) — quyền nằm ở signed cookie.
//  • Chưa bật (local) → presigned S3 hạn ngắn như cũ.
async function buildViewUrl(key: string): Promise<string> {
  if (cloudfrontEnabled()) return cdnUrl(key);
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.S3_VIDEOS_BUCKET, Key: key }),
    { expiresIn: VIEW_TTL },
  );
}

// Ký + gắn signed cookie cho TẤT CẢ video của user vào response (CloudFront bật).
// SameSite=None + Secure + Domain=.<root> để trình duyệt gửi cookie tới subdomain CDN.
function setVideoCookies(res: Response, userId: string) {
  const cookies = signVideoCookies(userId, VIDEO_COOKIE_TTL);
  const opts = {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    path: "/",
    maxAge: VIDEO_COOKIE_TTL * 1000,
    encode: (v: string) => v, // KHÔNG encode — giá trị CloudFront đã là URL-safe
    ...(env.CLOUDFRONT_COOKIE_DOMAIN
      ? { domain: env.CLOUDFRONT_COOKIE_DOMAIN }
      : {}),
  };
  for (const [name, value] of Object.entries(cookies)) res.cookie(name, value, opts);
}

const MAX_VIDEO_BYTES = env.S3_VIDEOS_MAX_GB * 1024 ** 3; // cấu hình qua env
const UPLOAD_TTL = 6 * 60 * 60; // 6h — đủ ký UploadPart cho upload file lớn
// URL XEM (GET) hạn NGẮN: ai copy link S3 ra ngoài cũng chóng hết hạn. FE tự xin
// lại link mới khi bấm xem / khi hết hạn giữa chừng (xem VideoTab.togglePlay).
const VIEW_TTL = 15 * 60; // 15 phút
const MIN_PART_SIZE = 5 * 1024 ** 2; // S3: part >= 5MB (trừ part cuối)
const MAX_PARTS = 10000; // S3: tối đa 10.000 part / object
const MAX_SIGN_BATCH = 1000; // số part tối đa ký 1 lần ở /sign

// BE KHÔNG tự chia part. FE quyết định partSize/partCount; BE chỉ trả ràng buộc
// của S3 (minPartSize, maxParts) + ký URL cho đúng partNumber FE yêu cầu.

const EXT_BY_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
};

function ensureConfigured() {
  if (!env.S3_VIDEOS_BUCKET)
    throw badRequest("S3 video storage not configured (S3_VIDEOS_BUCKET)");
}

// Key hợp lệ = videos/<userId>/<uuid>.<ext> do server cấp. Vừa chống path traversal
// (chỉ nhận đúng định dạng này), vừa CÔ LẬP THEO USER: segment <userId> phải khớp
// user đang đăng nhập → user A không thể sign/complete/xoá/xem video của user B.
function assertOwnedKey(key: string, userId: string) {
  const m = /^videos\/([^/]+)\/[a-f0-9-]+\.[a-z0-9]+$/i.exec(key);
  if (!m) throw badRequest("Invalid key");
  if (m[1] !== userId) throw forbidden("You do not own this video");
}

// ─── 1) Khởi tạo multipart: trả uploadId + presigned URL cho từng part ──────
router.post(
  "/multipart/create",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const filename = requireString(req.body?.filename, "filename", 255);
    const contentType = requireString(
      req.body?.contentType,
      "contentType",
      100,
    );
    const size = Number(req.body?.size);

    if (!contentType.startsWith("video/"))
      throw badRequest("Only video files are allowed");
    if (!Number.isFinite(size) || size <= 0)
      throw badRequest("Invalid file size");
    if (size > MAX_VIDEO_BYTES)
      throw badRequest(`Video exceeds ${env.S3_VIDEOS_MAX_GB}GB limit`);

    const ext =
      EXT_BY_MIME[contentType] ??
      filename
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(/[^a-z0-9]/g, "") ??
      "bin";
    // Mỗi user có "thư mục" riêng → cô lập dữ liệu giữa các user.
    const key = `videos/${req.user!.userId}/${randomUUID()}.${ext}`;

    const created = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: key,
        ContentType: contentType,
        Metadata: { "original-filename": encodeURIComponent(filename) },
      }),
    );
    const uploadId = created.UploadId!;

    // Trả ràng buộc S3 để FE tự tính partSize/partCount. KHÔNG ký URL ở đây.
    res.json({ key, uploadId, minPartSize: MIN_PART_SIZE, maxParts: MAX_PARTS });
  }),
);

// ─── 1b) Ký presigned URL cho các part FE yêu cầu (lazy, theo lô) ───────────
// FE tự chia part rồi xin ký partNumber nào cần. Ký bằng secret key của BE nên
// BẮT BUỘC ở server. Validate chặt partNumber để tránh lạm dụng.
router.post(
  "/multipart/sign",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const key = requireString(req.body?.key, "key", 255);
    const uploadId = requireString(req.body?.uploadId, "uploadId", 255);
    assertOwnedKey(key, req.user!.userId);

    const partNumbers = req.body?.partNumbers;
    if (!Array.isArray(partNumbers) || partNumbers.length === 0)
      throw badRequest("partNumbers must be a non-empty array");
    if (partNumbers.length > MAX_SIGN_BATCH)
      throw badRequest(`Max ${MAX_SIGN_BATCH} partNumbers per request`);
    if (!partNumbers.every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_PARTS))
      throw badRequest("Invalid partNumber");

    const urls = await Promise.all(
      partNumbers.map(async (partNumber: number) => ({
        partNumber,
        url: await getSignedUrl(
          s3,
          new UploadPartCommand({ Bucket: env.S3_VIDEOS_BUCKET, Key: key, UploadId: uploadId, PartNumber: partNumber }),
          { expiresIn: UPLOAD_TTL },
        ),
      })),
    );
    res.json({ urls });
  }),
);

// ─── 2) Hoàn tất: ghép các part lại + trả URL xem video (presigned GET) ─────
router.post(
  "/multipart/complete",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const key = requireString(req.body?.key, "key", 255);
    const uploadId = requireString(req.body?.uploadId, "uploadId", 255);
    assertOwnedKey(key, req.user!.userId);

    const rawParts = req.body?.parts;
    if (!Array.isArray(rawParts) || rawParts.length === 0)
      throw badRequest("parts required");
    const Parts = rawParts
      .map((p) => ({
        PartNumber: Number(p?.PartNumber),
        ETag: String(p?.ETag ?? ""),
      }))
      .filter((p) => Number.isInteger(p.PartNumber) && p.ETag)
      .sort((a, b) => a.PartNumber - b.PartNumber);
    if (Parts.length !== rawParts.length) throw badRequest("Invalid parts");

    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts },
      }),
    );

    const viewUrl = await buildViewUrl(key);
    res.json({ key, viewUrl });
  }),
);

// ─── 3) Huỷ multipart (khi user xoá file đang up / lỗi) → dọn part trên S3 ──
router.post(
  "/multipart/abort",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const key = requireString(req.body?.key, "key", 255);
    const uploadId = requireString(req.body?.uploadId, "uploadId", 255);
    assertOwnedKey(key, req.user!.userId);
    await s3.send(
      new AbortMultipartUploadCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Key: key,
        UploadId: uploadId,
      }),
    );
    res.json({ message: "aborted" });
  }),
);

// ─── 5) Liệt kê tất cả video đã upload (F5 → load lại từ S3) ────────────────
router.get(
  "/",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    // CHỈ liệt kê video của user đang đăng nhập (prefix riêng theo userId).
    const out = await s3.send(
      new ListObjectsV2Command({
        Bucket: env.S3_VIDEOS_BUCKET,
        Prefix: `videos/${req.user!.userId}/`,
        MaxKeys: 1000,
      }),
    );
    const objects = (out.Contents ?? []).filter((o) => o.Key && o.Size != null);
    // Mới nhất lên đầu.
    objects.sort(
      (a, b) =>
        (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
    );
    const videos = await Promise.all(
      objects.map(async (o) => ({
        key: o.Key!,
        size: o.Size!,
        lastModified: o.LastModified?.toISOString() ?? null,
        viewUrl: await buildViewUrl(o.Key!),
      })),
    );
    res.json(videos);
  }),
);

// ─── 6) Xoá 1 video khỏi S3 ─────────────────────────────────────────────────
router.post(
  "/delete",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const key = requireString(req.body?.key, "key", 255);
    assertOwnedKey(key, req.user!.userId);
    await s3.send(
      new DeleteObjectCommand({ Bucket: env.S3_VIDEOS_BUCKET, Key: key }),
    );
    res.json({ message: "deleted" });
  }),
);

// ─── 6b) Xoá NHIỀU video cùng lúc (1 call S3, tối đa 1000 key) ───────────────
router.post(
  "/delete-many",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const keys = req.body?.keys;
    if (!Array.isArray(keys) || keys.length === 0)
      throw badRequest("keys must be a non-empty array");
    if (keys.length > 1000) throw badRequest("Max 1000 keys per request");
    if (!keys.every((k) => typeof k === "string"))
      throw badRequest("keys must contain strings only");
    keys.forEach((k) => assertOwnedKey(k, req.user!.userId)); // chặn key bậy + chỉ xoá video của chính mình — 1 key sai → reject cả lô

    const result = await s3.send(
      new DeleteObjectsCommand({
        Bucket: env.S3_VIDEOS_BUCKET,
        Delete: { Objects: keys.map((Key: string) => ({ Key })), Quiet: true },
      }),
    );
    const errors = result.Errors?.length ?? 0;
    res.json({ deleted: keys.length - errors, errors });
  }),
);

// ─── 4) Lấy lại URL xem video (presigned GET hết hạn thì xin lại) ───────────
router.post(
  "/view-url",
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    ensureConfigured();
    const key = requireString(req.body?.key, "key", 255);
    assertOwnedKey(key, req.user!.userId);
    // CloudFront bật → set signed cookie (cấp quyền xem videos/<userId>/*) rồi trả
    // URL CDN "sạch". FE gọi endpoint này (kèm credentials) ngay trước khi phát /
    // khi cookie hết hạn giữa chừng → cookie luôn mới.
    if (cloudfrontEnabled()) setVideoCookies(res, req.user!.userId);
    const viewUrl = await buildViewUrl(key);
    res.json({ viewUrl });
  }),
);

export default router;
