/**
 * Spacing scale — dùng cho padding, margin, gap thay vì magic numbers.
 *
 * Usage:
 *   <View style={{ padding: spacing.md, marginBottom: spacing.lg }}>
 *
 * Quy ước: tăng 4px mỗi step ở dưới, 8px ở trên (Material/Tailwind-ish).
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export type SpacingKey = keyof typeof spacing;
