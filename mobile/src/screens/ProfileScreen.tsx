import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@/store/AuthContext';
import { useCart } from '@/store/CartContext';
import { usersApi } from '@/api/endpoints/users';
import { colors } from '@/theme/colors';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import type { RootStackParamList } from '@/navigation/types';

export default function ProfileScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAdmin, logout, loading, updateUser } = useAuth();
  const { clearCart } = useCart();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (loading) {
    return <View style={styles.center} />;
  }

  if (!user) {
    return (
      <View style={styles.guest}>
        <Text style={styles.guestIcon}>👋</Text>
        <Text style={styles.guestTitle}>Chào bạn!</Text>
        <Text style={styles.guestSubtitle}>
          Đăng nhập để theo dõi đơn hàng và lưu giỏ hàng của bạn
        </Text>
        <Button
          title="Đăng nhập"
          onPress={() => navigation.navigate('Login')}
          style={{ alignSelf: 'stretch', marginTop: 18 }}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={{ marginTop: 12 }}
        >
          <Text style={styles.linkText}>
            Chưa có tài khoản?{' '}
            <Text style={{ color: colors.primary, fontWeight: '700' }}>
              Đăng ký ngay
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Họ tên không được để trống.');
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.update(user.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      await updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể lưu';
      Alert.alert('Lỗi', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất?', 'Bạn có muốn đăng xuất khỏi tài khoản?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          clearCart();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: 28 }}
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View
            style={[
              styles.roleBadge,
              isAdmin
                ? { backgroundColor: '#F3E8FF' }
                : { backgroundColor: colors.primarySoft },
            ]}
          >
            <Text
              style={[
                styles.roleBadgeText,
                { color: isAdmin ? '#7E22CE' : colors.primaryDark },
              ]}
            >
              {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin cá nhân</Text>

          <Text style={styles.label}>Họ tên</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Họ tên"
            placeholderTextColor={colors.textLight}
          />

          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.readonly]}>
            <Text style={styles.readonlyText}>{user.email}</Text>
          </View>

          <Text style={styles.label}>Số điện thoại</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            placeholder="0901234567"
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
          />

          <Button
            title={saved ? 'Đã lưu ✓' : 'Lưu thay đổi'}
            onPress={handleSave}
            loading={saving}
            style={{ marginTop: 16 }}
          />
        </View>

        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Orders')}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowIcon}>📦</Text>
              <Text style={styles.rowLabel}>Đơn hàng của tôi</Text>
            </View>
            <Icon name="arrow-right" size={22} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <Button title="Đăng xuất" variant="outline" onPress={handleLogout} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guest: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },
  guestIcon: { fontSize: 56, marginBottom: 12 },
  guestTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  guestSubtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    fontSize: 13,
  },
  linkText: { color: colors.textMuted, fontSize: 13 },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  email: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
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
  readonly: { backgroundColor: colors.borderLight },
  readonlyText: { color: colors.textMuted, fontSize: 14 },
  menuCard: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { fontSize: 20 },
  rowLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
});
