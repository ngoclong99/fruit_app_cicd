import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/store/AuthContext';
import { colors } from '@/theme/colors';
import Button from '@/components/Button';
import type { RootStackParamList } from '@/navigation/types';

export default function LoginScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập email và mật khẩu.');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
      navigation.goBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Đăng nhập thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <Text style={styles.brandIcon}>🥬</Text>
          <Text style={styles.brandName}>Fresh Mart</Text>
          <Text style={styles.brandTagline}>Tươi mỗi ngày, khoẻ mỗi ngày</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Đăng nhập</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            secureTextEntry
          />

          <Button
            title="Đăng nhập"
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 14 }}
          />

          <TouchableOpacity
            style={{ marginTop: 14, alignItems: 'center' }}
            onPress={() => navigation.replace('Register')}
          >
            <Text style={styles.linkText}>
              Chưa có tài khoản?{' '}
              <Text style={styles.linkAccent}>Đăng ký ngay</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  brand: { alignItems: 'center', marginBottom: 22 },
  brandIcon: { fontSize: 48 },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryDark,
    marginTop: 4,
  },
  brandTagline: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  card: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  linkText: { color: colors.textMuted, fontSize: 13 },
  linkAccent: { color: colors.primary, fontWeight: '700' },
});
