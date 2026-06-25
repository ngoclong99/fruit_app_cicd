import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ordersApi } from '@/api/endpoints/orders';
import { colors } from '@/theme/colors';
import {
  formatDateTime,
  formatVnd,
  statusColor,
  statusLabel,
} from '@/utils/format';
import EmptyState from '@/components/EmptyState';
import Button from '@/components/Button';
import type { Order } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

export default function OrdersScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await ordersApi.list({ limit: 100 });
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleCancel = (id: string) => {
    Alert.alert('Huỷ đơn hàng?', 'Bạn có chắc muốn huỷ đơn này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Huỷ đơn',
        style: 'destructive',
        onPress: async () => {
          setCancelling(id);
          try {
            const updated = await ordersApi.cancel(id);
            setOrders((prev) =>
              prev.map((o) => (o.id === id ? updated : o)),
            );
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Không thể huỷ';
            Alert.alert('Lỗi', msg);
          } finally {
            setCancelling(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Chưa có đơn hàng"
        subtitle="Hãy đặt đơn đầu tiên của bạn"
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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 12, gap: 10 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {orders.map((order) => (
        <View key={order.id} style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderId} numberOfLines={1}>
                {order.id}
              </Text>
              <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
            </View>
            <View style={styles.headerRight}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${statusColor(order.status)}15` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: statusColor(order.status) },
                  ]}
                >
                  {statusLabel(order.status)}
                </Text>
              </View>
              {order.status === 'pending' && (
                <TouchableOpacity
                  disabled={cancelling === order.id}
                  onPress={() => handleCancel(order.id)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelText}>
                    {cancelling === order.id ? '...' : 'Huỷ'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {order.items.map(({ product, quantity }) => (
            <View key={product.id} style={styles.itemRow}>
              <Image source={{ uri: product.image }} style={styles.thumb} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {product.name}
                </Text>
                <Text style={styles.itemMeta}>
                  x{quantity} · {formatVnd(product.price)}/{product.unit}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                {formatVnd(product.price * quantity)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.footer}>
            <Text style={styles.address} numberOfLines={1}>
              📍 {order.address}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.total}>{formatVnd(order.total)}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: { fontWeight: '700', color: colors.text, fontSize: 13 },
  date: { color: colors.textLight, fontSize: 11, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: { fontWeight: '700', fontSize: 11 },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  itemMeta: { color: colors.textLight, fontSize: 11, marginTop: 2 },
  itemPrice: { color: colors.text, fontWeight: '700', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  address: { flex: 1, color: colors.textMuted, fontSize: 11 },
  totalLabel: { color: colors.textLight, fontSize: 11 },
  total: { color: colors.primaryDark, fontWeight: '800', fontSize: 16 },
  cancelBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 11 },
});
