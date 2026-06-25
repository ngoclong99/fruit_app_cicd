// Helper nhận diện lỗi PostgreSQL theo SQLSTATE code.
// Dùng để map lỗi DB → HTTP error phù hợp (vd unique_violation → 409 Conflict).

/** true nếu lỗi là Postgres unique_violation (SQLSTATE 23505). */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
