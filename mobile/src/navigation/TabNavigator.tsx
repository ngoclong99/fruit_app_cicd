// =============================================================================
// navigation/TabNavigator.tsx — Bottom tabs (5 tab: Home/Products/Drinks/Cart/Profile)
// =============================================================================
// Tương đương <BottomNav> trên web (cố định dưới đáy), nhưng bottom tabs của
// React Navigation tự xử lý active tab + animation + accessibility.
//
// Cách hiểu nhanh:
//   - Tab.Navigator chứa nhiều Tab.Screen (giống Routes/Route trên web).
//   - tabBarIcon nhận { focused, color, size } để render icon.
//     `color` đã tự đổi theo active/inactive (xem activeTintColor/inactiveTintColor).
// =============================================================================

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ProductsScreen from '../screens/ProductsScreen';
import DrinksScreen from '../screens/DrinksScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import type { TabParamList } from './types';
import { colors } from '../theme/colors';
import { useCart } from '../store/CartContext';
import Icon from '../components/Icon';

const Tab = createBottomTabNavigator<TabParamList>();

// Icon riêng cho tab Cart vì cần đọc state (số item) để vẽ badge đỏ ở góc.
// Tách thành component vì hook (useCart) chỉ được gọi trong component.
function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { count } = useCart();
  return (
    // RN không có <div> — dùng <View>. View mặc định là display:flex column.
    <View>
      <Icon name="cart" color={color} size={size} />
      {count > 0 && (
        <View style={styles.badge}>
          {/* Text BẮT BUỘC bọc chữ. Không thể đặt text trực tiếp trong View
              (sẽ lỗi "Text strings must be rendered within a <Text> component"). */}
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        // Header phía trên (giống <h1> title của trang)
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        // Màu icon/label tab khi active vs inactive
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          // Hàm trả về JSX cho icon. React Navigation gọi mỗi lần re-render.
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          title: 'Sản phẩm',
          tabBarIcon: ({ color, size }) => (
            <Icon name="grid" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Drinks"
        component={DrinksScreen}
        options={{
          title: 'Nước ép',
          tabBarIcon: ({ color, size }) => (
            <Icon name="drink" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Giỏ hàng',
          tabBarIcon: CartTabIcon, // dùng component riêng để có badge
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, size }) => (
            <Icon name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// StyleSheet.create(): khai báo style 1 lần, RN tối ưu thành object đông cứng,
// truyền tham chiếu sang native. Hiệu năng tốt hơn inline style {{...}}.
// Một số khác biệt với CSS:
//   - position: 'absolute' OK, NHƯNG 'fixed' không có.
//   - Không có cascading, không có pseudo (:hover, :active) — chỉ inline-like.
//   - flexDirection mặc định = 'column' (web là 'row').
//   - Số là pixel (number), không cần đơn vị 'px'. % vẫn dùng được dưới dạng string.
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});
