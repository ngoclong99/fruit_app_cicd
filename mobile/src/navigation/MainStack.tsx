// =============================================================================
// MainStack.tsx — Stack chính sau khi đã đăng nhập
// =============================================================================
// Chứa Tabs + các screen modal/push (ProductDetail, Search, Checkout, Orders).
// Login/Register KHÔNG nằm ở đây — chúng ở AuthStack.tsx.
//
// (Demo pattern — chưa wire vào App.tsx. Xem comment trong AuthStack.tsx.)
// =============================================================================

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabNavigator from './TabNavigator';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import { colors } from '../theme';

export type MainStackParamList = {
  Tabs: undefined;
  ProductDetail: { id: string };
  Search: undefined;
  Checkout: undefined;
  Orders: undefined;
};

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm' }} />
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Thanh toán' }} />
      <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'Đơn hàng của tôi' }} />
    </Stack.Navigator>
  );
}
