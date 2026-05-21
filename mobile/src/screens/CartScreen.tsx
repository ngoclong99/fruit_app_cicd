import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCart } from '../store/CartContext';
import { useAuth } from '../store/AuthContext';
import { colors } from '../theme/colors';
import { formatVnd } from '../utils/format';
import EmptyState from '../components/EmptyState';
import Button from '../components/Button';
import Icon from '../components/Icon';
import type { RootStackParamList } from '../navigation/types';

const FREE_SHIP_THRESHOLD = 300000;
const SHIPPING_FEE = 30000;

export default function CartScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { items, total, removeFromCart, updateQty, clearCart } = useCart();
  const { user } = useAuth();

  const shipping = total >= FREE_SHIP_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = total + shipping;

  const handleCheckout = () => {
    if (!user) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để thanh toán.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    navigation.navigate('Checkout');
  };

  const handleClear = () => {
    Alert.alert('Xoá tất cả?', 'Bạn có chắc muốn xoá toàn bộ giỏ hàng?', [
      { text: 'Huỷ', style: 'cancel' },
      { text: 'Xoá', style: 'destructive', onPress: () => clearCart() },
    ]);
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🛒"
        title="Giỏ hàng trống"
        subtitle="Hãy thêm sản phẩm yêu thích vào giỏ hàng"
      >
        <Button
          title="Mua sắm ngay"
          onPress={() =>
            navigation.navigate('Tabs', { screen: 'Products' })
          }
          style={{ marginTop: 18, paddingHorizontal: 28 }}
        />
      </EmptyState>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 220 }}>
        <View style={styles.headerRow}>
          <Text style={styles.headerCount}>
            {items.length} sản phẩm
          </Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearBtn}>Xoá tất cả</Text>
          </TouchableOpacity>
        </View>

        {items.map(({ product, quantity }) => (
          <View key={product.id} style={styles.item}>
            <Image source={{ uri: product.image }} style={styles.image} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.name} numberOfLines={2}>
                {product.name}
              </Text>
              <Text style={styles.meta}>
                📍 {product.origin} · {product.unit}
              </Text>
              <Text style={styles.price}>{formatVnd(product.price)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => removeFromCart(product.id)}>
                <Icon name="trash" size={16} color={colors.textLight} />
              </TouchableOpacity>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQty(product.id, quantity - 1)}
                >
                  <Icon name="minus" size={12} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.qty}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => updateQty(product.id, quantity + 1)}
                >
                  <Icon name="plus" size={12} color={colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.lineTotal}>
                {formatVnd(product.price * quantity)}
              </Text>
            </View>
          </View>
        ))}

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Tóm tắt đơn hàng</Text>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Tạm tính</Text>
            <Text style={styles.summaryValue}>{formatVnd(total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.summaryLabel}>Phí giao hàng</Text>
            <Text
              style={[
                styles.summaryValue,
                shipping === 0 && { color: colors.primary },
              ]}
            >
              {shipping === 0 ? 'Miễn phí' : formatVnd(shipping)}
            </Text>
          </View>
          {shipping > 0 && (
            <View style={styles.hint}>
              <Text style={styles.hintText}>
                Mua thêm {formatVnd(FREE_SHIP_THRESHOLD - total)} để được miễn
                phí giao hàng
              </Text>
            </View>
          )}
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>{formatVnd(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>Tổng cộng</Text>
          <Text style={styles.footerTotal}>{formatVnd(grandTotal)}</Text>
        </View>
        <Button
          title="Thanh toán"
          onPress={handleCheckout}
          style={{ paddingHorizontal: 24 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  headerCount: { color: colors.textMuted, fontSize: 12 },
  clearBtn: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  image: { width: 72, height: 72, borderRadius: 10 },
  name: { fontWeight: '600', color: colors.text, fontSize: 13 },
  meta: { color: colors.textLight, fontSize: 11 },
  price: { color: colors.primaryDark, fontWeight: '700', marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  stepBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { width: 28, textAlign: 'center', fontWeight: '700', fontSize: 12 },
  lineTotal: { color: colors.text, fontWeight: '700', fontSize: 13 },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryValue: { color: colors.text, fontWeight: '600', fontSize: 13 },
  hint: {
    backgroundColor: colors.warningSoft,
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  hintText: { color: colors.warning, fontSize: 11 },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: { color: colors.text, fontWeight: '700', fontSize: 15 },
  totalValue: { color: colors.primaryDark, fontWeight: '800', fontSize: 17 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  footerLabel: { color: colors.textLight, fontSize: 11 },
  footerTotal: { color: colors.primaryDark, fontWeight: '800', fontSize: 17 },
});
