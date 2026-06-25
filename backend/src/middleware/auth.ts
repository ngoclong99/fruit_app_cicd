import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { JwtPayload } from '@/types';

// Re-export from env config so existing imports `JWT_SECRET` keep working.
export const JWT_SECRET = env.JWT_SECRET;

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & { purpose?: string };
    // CHẶN dùng nhầm token loại khác làm access token. Token MFA tạm (purpose:'mfa')
    // ký cùng JWT_SECRET — nếu không loại trừ, kẻ tấn công lấy mfaToken sau bước
    // mật khẩu (chưa nhập TOTP) có thể dùng làm Bearer token → bỏ qua MFA.
    if (payload.purpose) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'FORBIDDEN', message: 'Forbidden' });
    return;
  }
  next();
};
