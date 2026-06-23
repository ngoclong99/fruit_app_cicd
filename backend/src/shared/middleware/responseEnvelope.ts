import type { Request, Response, NextFunction } from "express";

// ============================================================================
// responseEnvelope — bọc MỌI response JSON về một format thống nhất.
// ----------------------------------------------------------------------------
//   Thành công (2xx):  { code: <status>, message: "OK", data: <payload gốc> }
//   Lỗi (>=400):       { code: <status>, error: "<CODE>", message, details? }
//
// `code` = đúng HTTP status (200/201/...). Nhờ vậy client có thể kiểm tra
// `res.code === 200` (theo yêu cầu) MÀ vẫn giữ đúng HTTP status (chuẩn REST).
//
// Cách hoạt động: ghi đè res.json 1 lần ở đầu pipeline → không phải sửa từng route.
// Lưu ý: 204 (DELETE) không có body nên không bị bọc — 204 tự nó là "thành công,
// không nội dung" theo chuẩn HTTP.
// ============================================================================
export function responseEnvelope(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = ((body?: unknown) => {
    const code = res.statusCode || 200;

    // Lỗi: giữ nguyên { error, message, details } + thêm code (HTTP status).
    if (code >= 400) {
      const errBody = body && typeof body === "object" ? body : { message: String(body) };
      return originalJson({ code, ...errBody });
    }

    // Thành công: bọc { code, message, data }.
    return originalJson({ code, message: "OK", data: body });
  }) as Response["json"];

  next();
}
