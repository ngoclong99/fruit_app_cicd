// =============================================================================
// AuthStack.tsx — Stack riêng cho luồng auth (chưa đăng nhập)
// =============================================================================
// PATTERN: Tách AuthStack vs MainStack giúp:
//   - Khi logout → setUser(null) → RootNavigator tự switch sang AuthStack
//     (KHÔNG cần navigate('Login') — sạch sẽ hơn, không bug "back về Tabs")
//   - Code splitting rõ ràng — Login/Register chỉ render khi cần
//
// Migration plan: hiện chưa được wire vào App.tsx — đang dùng RootNavigator.tsx
//   cũ (Login/Register cùng stack với Tabs). Khi sẵn sàng:
//     1. Tạo AppNavigator.tsx (conditional render)
//     2. App.tsx: <AppNavigator /> thay <RootNavigator />
//     3. Sửa 3 chỗ navigate('Login') trong CartScreen, ProfileScreen
//        → vì khi user null sẽ tự ở AuthStack
// =============================================================================

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { colors } from '../theme';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Đăng nhập' }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
    </Stack.Navigator>
  );
}
