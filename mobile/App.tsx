// =============================================================================
// App.tsx — Entry point của ứng dụng React Native (Expo)
// =============================================================================
// So với React.js trên web:
//   - Web có index.html + main.tsx -> ReactDOM.createRoot(...).render(<App/>)
//   - RN/Expo: file App.tsx là root. Expo tự gọi registerRootComponent(App).
//   - Không có <html>, <body>, không có CSS file. UI bằng <View>/<Text>.
// =============================================================================

import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/store/AuthContext';
import { CartProvider } from './src/store/CartContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    // SafeAreaProvider: cung cấp thông tin về "vùng an toàn" (notch, status bar,
    // home indicator) cho toàn app. React Navigation dùng nó để render header
    // không bị đè bởi notch tai thỏ trên iPhone.
    <SafeAreaProvider>
      {/* Providers giống y React web: bọc theo thứ tự để các context lồng nhau. */}
      <AuthProvider>
        <CartProvider>
          {/* NavigationContainer: tương đương BrowserRouter trên web.
              Quản lý URL/route state cho cả app. PHẢI có 1 cái duy nhất ở root. */}
          <NavigationContainer>
            {/* StatusBar: thanh trên cùng (giờ, pin, sóng).
                style="light" = chữ trắng (vì header app màu xanh đậm). */}
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
