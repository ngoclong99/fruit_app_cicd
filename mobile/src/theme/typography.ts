import type { TextStyle } from 'react-native';

/**
 * Typography scale — đảm bảo font size/weight nhất quán toàn app.
 *
 * Usage:
 *   <Text style={[typography.h2, { color: colors.text }]}>Tiêu đề</Text>
 *
 * Mỗi key trả về `TextStyle` object — có thể spread hoặc dùng trong mảng style.
 */
export const typography = {
  h1: { fontSize: 28, fontWeight: '800', lineHeight: 36 } satisfies TextStyle,
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 30 } satisfies TextStyle,
  h3: { fontSize: 18, fontWeight: '700', lineHeight: 26 } satisfies TextStyle,
  h4: { fontSize: 16, fontWeight: '600', lineHeight: 22 } satisfies TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 22 } satisfies TextStyle,
  bodyBold: { fontSize: 14, fontWeight: '600', lineHeight: 22 } satisfies TextStyle,
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 18 } satisfies TextStyle,
  captionBold: { fontSize: 12, fontWeight: '600', lineHeight: 18 } satisfies TextStyle,
  button: { fontSize: 14, fontWeight: '600', lineHeight: 20 } satisfies TextStyle,
  label: { fontSize: 13, fontWeight: '500', lineHeight: 18 } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
