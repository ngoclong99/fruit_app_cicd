import { badRequest } from '../middleware/errorHandler';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{8,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function requireString(value: unknown, field: string, max = 1000): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field} is required`);
  }
  if (value.length > max) throw badRequest(`${field} too long (max ${max})`);
  return value.trim();
}

export function optionalString(value: unknown, field: string, max = 1000): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  if (value.length > max) throw badRequest(`${field} too long (max ${max})`);
  return value.trim();
}

export function requireEmail(value: unknown): string {
  const s = requireString(value, 'email', 255).toLowerCase();
  if (!EMAIL_RE.test(s)) throw badRequest('Invalid email format');
  return s;
}

export function requirePhone(value: unknown): string {
  const s = requireString(value, 'phone', 20);
  if (!PHONE_RE.test(s)) throw badRequest('Invalid phone format');
  return s;
}

export function optionalPhone(value: unknown): string | undefined {
  const s = optionalString(value, 'phone', 20);
  if (s === undefined) return undefined;
  if (!PHONE_RE.test(s)) throw badRequest('Invalid phone format');
  return s;
}

export function requireNonNegInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
    throw badRequest(`${field} must be a non-negative integer`);
  }
  return n;
}

export function requirePositiveInt(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    throw badRequest(`${field} must be a positive integer`);
  }
  return n;
}

export function requireNonNegNumber(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw badRequest(`${field} must be a non-negative number`);
  }
  return n;
}

export function parseIntDefault(value: unknown, fallback: number, min = 1, max = 1000): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    throw badRequest(`Invalid integer (range ${min}-${max})`);
  }
  return n;
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw badRequest(`${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireEnum(value, allowed, field);
}

export function requireDate(value: unknown, field: string): string {
  const s = requireString(value, field, 10);
  if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  return s;
}

export function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return requireDate(value, field);
}
