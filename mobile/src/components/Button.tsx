import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
}: Props) {
  const isDisabled = !!loading || !!disabled;
  const bgMap = {
    primary: colors.primary,
    outline: '#fff',
    danger: colors.danger,
  } as const;
  const txtMap = {
    primary: '#fff',
    outline: colors.primary,
    danger: '#fff',
  } as const;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={isDisabled}
      onPress={onPress}
      style={[
        styles.btn,
        {
          backgroundColor: bgMap[variant],
          borderColor: variant === 'outline' ? colors.primary : 'transparent',
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={txtMap[variant]} />
      ) : (
        <Text style={[styles.text, { color: txtMap[variant] }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontWeight: '700',
    fontSize: 15,
  },
});
