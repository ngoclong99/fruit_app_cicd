// ============================================================================
// Tiện ích MULTIPART UPLOAD dùng chung (tái sử dụng cho mọi loại file, mọi kích cỡ).
//   - computePartSize: FE tự quyết định kích thước part dựa trên ràng buộc S3.
//   - putPart: PUT 1 part lên presigned URL (XHR để có progress + đọc ETag).
// ============================================================================

const MB = 1024 * 1024;
const PREFERRED_PART = 25 * MB; // ưu tiên ~25MB/part → file vừa không bị chia quá nhiều part

/**
 * Tính kích thước mỗi part (byte) cho file `size`.
 *  - >= minPartSize (S3 yêu cầu mỗi part >= 5MB, trừ part cuối)
 *  - ưu tiên ~25MB/part (vd 120MB → 5 part, không phải 24 part 5MB)
 *  - file lớn: tăng partSize để tổng part ~<=1000 và <= maxParts (S3 tối đa 10.000)
 * Hợp cho file bất kỳ: 120MB, 1GB, 20GB, 50GB…
 */
export function computePartSize(size: number, minPartSize: number, maxParts: number): number {
  const soft = Math.ceil(size / 1000 / MB) * MB; // file lớn: giữ ~<=1000 part
  const hard = Math.ceil(size / maxParts / MB) * MB; // bắt buộc <= maxParts
  return Math.max(minPartSize, PREFERRED_PART, soft, hard);
}

/** Số part khi chia `size` theo `partSize`. */
export function computePartCount(size: number, partSize: number): number {
  return Math.max(1, Math.ceil(size / partSize));
}

/**
 * PUT 1 part (blob) lên presigned URL. Dùng XMLHttpRequest vì:
 *  - fetch KHÔNG báo tiến trình upload (cần cho progress bar).
 *  - cần đọc header `ETag` trả về (bucket phải bật CORS ExposeHeaders: ETag).
 * Trả về ETag của part.
 */
export function putPart(url: string, blob: Blob, onProgress: (loaded: number) => void): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (etag) resolve(etag);
        else reject(new Error("Không đọc được ETag — bucket cần CORS ExposeHeaders: ETag"));
      } else {
        reject(new Error(`Part lỗi: HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Lỗi mạng/CORS khi tải part lên S3"));
    xhr.send(blob);
  });
}

/** Chia mảng thành các lô nhỏ (để ký URL theo lô, tránh request quá to). */
export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
