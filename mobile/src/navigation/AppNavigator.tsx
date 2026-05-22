// =============================================================================
// AppNavigator.tsx — Top-level navigator quyết định AuthStack vs MainStack
// =============================================================================
// Pattern khuyến nghị (chưa wire vào App.tsx — xem comment trong AuthStack.tsx).
//
// Lợi ích:
//   - Khi user logout: setUser(null) → AppNavigator re-render → switch AuthStack
//     (không cần navigate.reset() lằng nhằng)
//   - Khi user login: setUser(...) → switch MainStack tự động
//   - Code 2 stack độc lập, dễ thêm/sửa screen riêng
//
// Nếu muốn dùng:
//   // App.tsx
//   import { AppNavigator } from './src/navigation/AppNavigator';
//   ...
//   <NavigationContainer>
//     <AppNavigator />
//   </NavigationContainer>
//
// Đồng thời cần:
//   - Xoá <RootNavigator /> import + usage
//   - Sửa CartScreen + ProfileScreen — bỏ navigation.navigate('Login')
//     (khi user null, tự động ở AuthStack — không cần điều hướng tay)
// =============================================================================

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../store/AuthContext';
import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';
import { colors } from '../theme';

export function AppNavigator() {
  const { user, loading } = useAuth();

  // Splash screen trong khi hydrate auth từ AsyncStorage.
  // Tránh chớp UI: user thấy Login 1 frame → Tabs nếu đã login.
  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return user ? <MainStack /> : <AuthStack />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
