import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/theme';

interface Props {
  error: Error;
  onRetry?: () => void;
  title?: string;
}

/**
 * Fallback UI hiển thị khi ErrorBoundary catch lỗi render-time.
 * Cũng dùng được standalone trong các screen có error state.
 */
export function ErrorScreen({ error, onRetry, title = 'Có lỗi xảy ra' }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message} numberOfLines={4}>
        {error.message || 'Đã có lỗi không mong muốn xảy ra. Vui lòng thử lại.'}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Thử lại</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.bg,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    ...typography.button,
    color: '#fff',
  },
});
