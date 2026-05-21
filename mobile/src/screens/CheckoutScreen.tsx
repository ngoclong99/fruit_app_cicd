// =============================================================================
// screens/CheckoutScreen.tsx — Thanh toán
// =============================================================================
// Form trên RN khác form trên web:
//   - <TextInput> thay <input>. Mỗi field tự quản state (useState) — không có
//     uncontrolled input như web (kiểu defaultValue + ref).
//   - KeyboardAvoidingView: khi bàn phím mở, đẩy nội dung lên để không che input.
//     iOS dùng behavior="padding", Android thường tự xử lý (windowSoftInputMode).
//   - Alert.alert(title, msg, buttons): popup native (giống window.alert nhưng
//     có buttons + style="destructive"/"cancel"). KHÔNG có <dialog>.
// =============================================================================

import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCart } from '../store/CartContext';
import { useAuth } from '../store/AuthContext';
import { ordersApi } from '../api/endpoints/orders';
import { formatVnd } from '../utils/format';
import { colors } from '../theme/colors';
import Button from '../components/Button';
import type { RootStackParamList } from '../navigation/types';

const FREE_SHIP_THRESHOLD = 300000;
const SHIPPING_FEE = 30000;

const PAYMENT_METHODS = [
  { value: 'cod', icon: '💵', label: 'Thanh toán khi nhận hàng' },
  { value: 'bank', icon: '🏦', label: 'Chuyển khoản ngân hàng' },
  { value: 'momo', icon: '💜', label: 'Ví MoMo' },
  { value: 'vnpay', icon: '💳', label: 'VNPAY' },
];

export default function CheckoutScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState('cod');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const shipping = total >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = total + shipping;

  const handleSubmit = async () => {
    if (!name.trim() || !address.trim() || !phone.trim()) {
      Alert.alert(
        'Thiếu thông tin',
        'Vui lòng nhập đầy đủ họ tên, địa chỉ và số điện thoại.',
      );
      return;
    }
    if (items.length === 0) {
      Alert.alert('Giỏ hàng trống');
      return;
    }
    try {
      setSubmitting(true);
      await ordersApi.create({
        items,
        total: grandTotal,
        address: address.trim(),
        phone: phone.trim(),
        note: note.trim() || undefined,
      });
      clearCart();
      setSuccess(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Không thể đặt hàng';
      Alert.alert('Lỗi', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successWrap}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Đặt hàng thành công!</Text>
        <Text style={styles.successDesc}>
          Cảm ơn bạn đã mua hàng tại Fresh Mart.
        </Text>
        <Text style={styles.successHint}>
          Chúng tôi sẽ liên hệ với bạn để xác nhận đơn hàng.
        </Text>
        <View style={styles.successButtons}>
          <Button
            title="Xem đơn hàng"
            onPress={() => navigation.replace('Orders')}
            style={{ flex: 1 }}
          />
          <Button
            title="Trang chủ"
            variant="outline"
            onPress={() =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Tabs' }],
                }),
              )
            }
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  return (
    // Platform.OS = 'ios' | 'android' | 'web' | 'windows' | 'macos'
    // Mỗi nền tảng có hành vi bàn phím khác nhau → check Platform.OS.
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin giao hàng</Text>
          <Text style={styles.label}>Họ tên *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Họ tên"
            placeholderTextColor={colors.textLight}
          />
          <Text style={styles.label}>Số điện thoại *</Text>
          {/* TextInput KHÁC <input>:
              - onChangeText nhận thẳng STRING (không phải event.target.value).
              - placeholderTextColor: phải set riêng, không cascade từ color.
              - keyboardType: 'default'|'numeric'|'phone-pad'|'email-address'...
                bật bàn phím phù hợp trên iOS/Android. */}
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="VD: 0901234567"
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Địa chỉ giao hàng *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Số nhà, đường, phường/xã, quận/huyện..."
            placeholderTextColor={colors.textLight}
            multiline
          />
          <Text style={styles.label}>Ghi chú (tuỳ chọn)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={note}
            onChangeText={setNote}
            placeholder="VD: Giao giờ hành chính..."
            placeholderTextColor={colors.textLight}
            multiline
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
          {PAYMENT_METHODS.map((m) => {
            const active = payment === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.paymentRow, active && styles.paymentRowActive]}
                activeOpacity={0.8}
                onPress={() => setPayment(m.value)}
              >
                <View style={styles.radioOuter}>
                  {active && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.paymentIcon}>{m.icon}</Text>
                <Text style={styles.paymentLabel}>{m.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đơn hàng ({items.length})</Text>
          {items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.row}>
              <Text style={styles.itemName} numberOfLines={1}>
                {product.name}{' '}
                <Text style={{ color: colors.textLight }}>× {quantity}</Text>
              </Text>
              <Text style={styles.itemPrice}>
                {formatVnd(product.price * quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.value}>{formatVnd(total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Phí giao hàng</Text>
            <Text
              style={[
                styles.value,
                shipping === 0 && { color: colors.primary },
              ]}
            >
              {shipping === 0 ? 'Miễn phí' : formatVnd(shipping)}
            </Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVnd(grandTotal)}</Text>
          </View>
        </View>

        <Button
          title={`Đặt hàng · ${formatVnd(grandTotal)}`}
          onPress={handleSubmit}
          loading={submitting}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
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
  multiline: { minHeight: 56, textAlignVertical: 'top' },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    borderRadius: 12,
    marginTop: 10,
  },
  paymentRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  paymentIcon: { fontSize: 20 },
  paymentLabel: { color: colors.text, fontWeight: '500', fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: { flex: 1, color: colors.text, fontSize: 13 },
  itemPrice: { color: colors.text, fontWeight: '600', fontSize: 13 },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  value: { color: colors.text, fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: { fontWeight: '700', color: colors.text, fontSize: 15 },
  totalValue: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 17,
  },
  successWrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 72, marginBottom: 12 },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  successHint: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  successButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    alignSelf: 'stretch',
  },
});
