import { getSignedCookies } from "@aws-sdk/cloudfront-signer";
import { env } from "@/config/env";

// ============================================================================
// CloudFront signed cookie — phát video private qua CDN mà KHÔNG nhúng chữ ký
// vào URL. Quyền truy cập nằm ở COOKIE (gắn với phiên/trình duyệt) → copy mỗi
// link video gửi người khác là vô dụng (thiếu cookie → CloudFront trả 403).
//
// Bật khi cấu hình đủ 3 biến env (production). Để trống → backend tự fallback
// về presigned S3 (xem buildViewUrl trong routes/videos.ts) → local vẫn chạy.
// ============================================================================

/** Đã cấu hình đủ để dùng CloudFront chưa? Thiếu 1 biến → coi như tắt (fallback S3). */
export function cloudfrontEnabled(): boolean {
  return Boolean(
    env.CLOUDFRONT_DOMAIN &&
      env.CLOUDFRONT_KEY_PAIR_ID &&
      env.CLOUDFRONT_PRIVATE_KEY,
  );
}

/** URL CDN "sạch" (KHÔNG chữ ký) tới 1 object — chỉ xem được nếu trình duyệt có signed cookie. */
export function cdnUrl(key: string): string {
  return `https://${env.CLOUDFRONT_DOMAIN}/${key}`;
}

export interface CloudFrontCookies {
  "CloudFront-Policy": string;
  "CloudFront-Signature": string;
  "CloudFront-Key-Pair-Id": string;
}

/**
 * Ký bộ cookie cho phép xem MỌI video của user (`videos/<userId>/*`) trong `ttlSeconds`.
 * Dùng custom policy (có wildcard) → 1 lần ký xem được cả thư viện, không phải ký từng file.
 */
export function signVideoCookies(
  userId: string,
  ttlSeconds: number,
): CloudFrontCookies {
  // PEM lưu trong env thường để xuống dòng dạng "\n" → khôi phục về newline thật.
  const privateKey = env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const resource = `https://${env.CLOUDFRONT_DOMAIN}/videos/${userId}/*`;
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const policy = JSON.stringify({
    Statement: [
      { Resource: resource, Condition: { DateLessThan: { "AWS:EpochTime": expires } } },
    ],
  });
  return getSignedCookies({
    keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
    privateKey,
    policy,
  }) as CloudFrontCookies;
}
