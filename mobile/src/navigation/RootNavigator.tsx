// =============================================================================
// navigation/RootNavigator.tsx — Stack navigator gốc
// =============================================================================
// Khác với React Router (web):
//   - Web: <BrowserRouter> + <Routes> + <Route path="/cart">. URL điều khiển UI.
//   - RN: KHÔNG có URL. Mỗi navigator quản lý 1 "stack" màn hình (như stack
//         activity trên Android, view controllers trên iOS). Người dùng push/pop.
//
// Kiến trúc app này có 2 lớp navigator lồng nhau:
//
//   RootNavigator (Stack)        <-- file này
//   ├─ Tabs (Bottom Tabs)        <-- TabNavigator.tsx
//   │   ├─ Home
//   │   ├─ Products
//   │   ├─ Drinks
//   │   ├─ Cart
//   │   └─ Profile
//   ├─ ProductDetail (push)
//   ├─ Search        (push)
//   ├─ Login         (push)
//   ├─ Register      (push)
//   ├─ Checkout      (push)
//   └─ Orders        (push)
//
// Khi user vào Home rồi tap sản phẩm: RN push ProductDetail lên trên stack
// (Tabs vẫn ở dưới). Khi user back: pop ra, quay lại Tabs với tab Home.
// =============================================================================

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ProductDetailScreen from '@/screens/ProductDetailScreen';
import SearchScreen from '@/screens/SearchScreen';
import LoginScreen from '@/screens/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen';
import CheckoutScreen from '@/screens/CheckoutScreen';
import OrdersScreen from '@/screens/OrdersScreen';
import type { RootStackParamList } from './types';
import { colors } from '@/theme/colors';

// createNativeStackNavigator<TypeMap>(): truyền type map để TS biết các route
// và param tương ứng (xem ./types.ts). Tương tự như typed router trên web.
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      // screenOptions = options áp dụng cho TẤT CẢ screen trong navigator này.
      // Có thể override từng screen bằng options={{...}} trên Stack.Screen.
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff', // màu chữ + nút back
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '', // iOS: không hiện chữ "Back" cạnh mũi tên
      }}
    >
      {/* Screen đầu tiên = màn hình mặc định khi mở app */}
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }} // tab navigator tự có header riêng
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: 'Chi tiết sản phẩm' }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Tìm kiếm' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Đăng nhập' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Đăng ký' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ title: 'Thanh toán' }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: 'Đơn hàng của tôi' }}
      />
    </Stack.Navigator>
  );
}
