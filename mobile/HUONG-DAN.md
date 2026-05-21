# Hướng dẫn Fresh Mart Mobile — cho người chuyển từ React.js sang React Native

> File này dành cho bạn: đã code React.js, lần đầu chạm React Native.
> Đọc lướt qua phần 1–3 trước khi mở code. Phần 4 trở đi tra cứu khi cần.

---

## Mục lục

1. [Bức tranh tổng thể: RN khác React.js như thế nào?](#1-bức-tranh-tổng-thể)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Cách chạy app lần đầu](#3-cách-chạy-app-lần-đầu)
4. [Các khái niệm RN khác React.js](#4-các-khái-niệm-rn-khác-reactjs)
5. [Navigation (thay React Router)](#5-navigation)
6. [State management](#6-state-management)
7. [Gọi API + lưu token](#7-gọi-api--lưu-token)
8. [Style & Layout (thay CSS)](#8-style--layout)
9. [Hành trình trong app — flow chính](#9-hành-trình-trong-app)
10. [Debug + lỗi thường gặp](#10-debug--lỗi-thường-gặp)
11. [Build APK / IPA để release](#11-build-apk--ipa)
12. [Cheatsheet 1 trang](#12-cheatsheet)

---

## 1. Bức tranh tổng thể

React Native (RN) = viết React, nhưng **không có DOM**. Component được chuyển thành **UI native thật** trên iOS và Android.

| React.js (Web)               | React Native                                   |
| ---------------------------- | ---------------------------------------------- |
| `<div>`                      | `<View>`                                       |
| `<span>`, text trần trong JSX | `<Text>` (bắt buộc bọc mọi chuỗi)              |
| `<img src="...">`            | `<Image source={{ uri: '...' }} />`            |
| `<button onClick>`           | `<TouchableOpacity onPress>`                   |
| `<input>`                    | `<TextInput value onChangeText>`               |
| `<a href>`                   | `navigation.navigate('Screen')`                |
| CSS file / Tailwind          | `StyleSheet.create({ ... })` — inline, JS-only |
| `localStorage`               | `AsyncStorage` (async, phải `await`)           |
| `window.location`            | KHÔNG có — dùng navigation prop                |
| React Router                 | React Navigation                               |
| Vite / Webpack               | Metro bundler (Expo dùng sẵn)                  |

**Expo** = wrapper trên RN giúp dev nhanh trên Windows/macOS, không cần Xcode/Android Studio để bắt đầu. Dự án này dùng **Expo Managed Workflow** — đơn giản nhất.

Quan trọng cần nhớ:
- App không có URL. Mọi điều hướng qua hàm `navigation.navigate(...)`.
- Không có cascade CSS, không `:hover`, không media query bằng CSS. Layout luôn là **Flexbox** (mặc định `flexDirection: 'column'`, ngược với web).
- Bóng đổ: iOS dùng `shadow*`, Android dùng `elevation`. Phải set cả hai.

---

## 2. Cấu trúc thư mục

```
mobile/
├─ App.tsx                          ← entry: Providers + NavigationContainer
├─ app.json                         ← cấu hình Expo (TÊN APP, ICON, apiUrl)
├─ package.json                     ← dependencies
├─ babel.config.js                  ← preset Expo
├─ tsconfig.json                    ← TypeScript config
│
└─ src/
   ├─ api/
   │  ├─ client.ts                  ← axios instance + interceptor token
   │  └─ endpoints/                 ← 1 file = 1 nhóm endpoint
   │     ├─ auth.ts                 (login, register, me, change-password)
   │     ├─ products.ts             (list, get)
   │     ├─ categories.ts           (list, tree)
   │     ├─ orders.ts               (list, get, create, cancel)
   │     └─ users.ts                (get, update)
   │
   ├─ components/                   ← component dùng chung
   │  ├─ ProductCard.tsx            (card sản phẩm — đọc file này để hiểu RN)
   │  ├─ Button.tsx                 (3 variant: primary/outline/danger)
   │  ├─ EmptyState.tsx             (icon + title + subtitle)
   │  └─ Icon.tsx                   (emoji-based icon — không phụ thuộc lib)
   │
   ├─ navigation/
   │  ├─ RootNavigator.tsx          ← stack chính: Tabs + ProductDetail + ...
   │  ├─ TabNavigator.tsx           ← bottom tabs: Home/Products/Drinks/Cart/Profile
   │  └─ types.ts                   ← TypeScript map cho các route + params
   │
   ├─ screens/                      ← mỗi file = 1 màn hình
   │  ├─ HomeScreen.tsx
   │  ├─ ProductsScreen.tsx
   │  ├─ ProductDetailScreen.tsx
   │  ├─ DrinksScreen.tsx
   │  ├─ SearchScreen.tsx
   │  ├─ CartScreen.tsx
   │  ├─ CheckoutScreen.tsx
   │  ├─ OrdersScreen.tsx
   │  ├─ ProfileScreen.tsx
   │  ├─ LoginScreen.tsx
   │  └─ RegisterScreen.tsx
   │
   ├─ store/                        ← state toàn cục (Context API)
   │  ├─ AuthContext.tsx            (user, token, login/logout, persist)
   │  └─ CartContext.tsx            (items, addToCart, persist)
   │
   ├─ theme/colors.ts               ← palette dùng chung (xanh lá, đỏ, xám…)
   ├─ types/index.ts                ← User, Product, Order, Category, CartItem
   └─ utils/format.ts               ← formatVnd, formatDate, statusLabel
```

**Gợi ý đọc theo thứ tự:**
1. `App.tsx` → hiểu Providers, NavigationContainer
2. `navigation/RootNavigator.tsx` + `TabNavigator.tsx` → hiểu định tuyến
3. `components/ProductCard.tsx` → hiểu RN primitives (View/Text/Image/TouchableOpacity)
4. `api/client.ts` → hiểu cách gọi backend + auth header
5. `store/CartContext.tsx` → hiểu state + AsyncStorage
6. `screens/HomeScreen.tsx` → một màn hình tổng hợp

---

## 3. Cách chạy app lần đầu

### Yêu cầu

| Việc                         | Cần gì                                                  |
| ---------------------------- | ------------------------------------------------------- |
| Cài dependencies             | **Node 18+** (`node -v` để check)                       |
| Chạy trên Android Emulator   | **Android Studio** đã có 1 emulator (AVD)               |
| Chạy trên iOS Simulator      | Chỉ macOS — cài **Xcode**                               |
| Chạy trên điện thoại thật    | Cài app **Expo Go** (Play Store / App Store)            |

### Bước 1: Install dependencies

```bash
cd e:/AWS/Deploy-1/mobile
npm install
```

> Lần đầu mất 2–5 phút. Sau khi xong, các lỗi đỏ trong VS Code ("Cannot find module 'react'") sẽ hết.

### Bước 2: Sửa API URL trong `app.json`

Mở [app.json](app.json), tìm `expo.extra.apiUrl`:

```jsonc
"extra": {
  "apiUrl": "http://10.0.2.2:5000"   // ← sửa đây
}
```

Chọn URL đúng theo môi trường chạy:

| Môi trường              | Set `apiUrl` thành                          |
| ----------------------- | ------------------------------------------- |
| Android Emulator        | `http://10.0.2.2:5000` (mặc định)           |
| iOS Simulator (macOS)   | `http://localhost:5000`                     |
| Expo Go (điện thoại)    | `http://<LAN-IP máy dev>:5000`              |
| Backend deploy          | `https://api.your-domain.com`               |

> **Vì sao không phải `localhost`?** Vì "localhost" trên thiết bị Android = chính thiết bị, không phải máy dev. `10.0.2.2` là alias đặc biệt mà Android Emulator hiểu là "máy host". iPhone simulator dùng chung mạng với macOS nên `localhost` OK.

Tìm IP LAN trên Windows:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like 'Wi-Fi*' } | Select IPAddress
```

### Bước 3: Chạy backend

```bash
cd ../backend
npm install
npm run dev
# Sẽ in: Server running http://0.0.0.0:5000
```

### Bước 4: Chạy app

Mở terminal mới:

```bash
cd e:/AWS/Deploy-1/mobile
npm start
```

Một QR code và menu sẽ hiện ra. Bạn có 3 lựa chọn:

- **Bấm `a`** → mở trên Android Emulator (cần emulator đang chạy)
- **Bấm `i`** → mở trên iOS Simulator (chỉ macOS)
- **Quét QR** bằng app Expo Go trên điện thoại

> Lần đầu compile mất 30–60s. Sau đó hot-reload mỗi khi sửa code.

---

## 4. Các khái niệm RN khác React.js

### 4.1 Primitives — thay HTML tag

```tsx
// React.js (web)
<div className="card">
  <img src={url} />
  <span>Hello</span>
  <button onClick={fn}>Tap</button>
</div>

// React Native
<View style={styles.card}>
  <Image source={{ uri: url }} />
  <Text>Hello</Text>
  <TouchableOpacity onPress={fn}>
    <Text>Tap</Text>
  </TouchableOpacity>
</View>
```

**Luật:**
- Mọi chuỗi text **phải** ở trong `<Text>`. Đặt thẳng `Hello` trong `<View>` sẽ crash: `Text strings must be rendered within a <Text> component`.
- `<Text>` tự kế thừa style của `<Text>` cha (nhưng KHÔNG kế thừa qua `<View>`).

### 4.2 Style — StyleSheet thay CSS

```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    // KHÔNG có 'px' — số là pixel
    // KHÔNG có 'background-color' — phải camelCase
    // KHÔNG có shorthand 'padding: 10 20' — dùng paddingHorizontal/Vertical
  },
});
```

**Các pattern thường gặp:**

| Web CSS                              | RN StyleSheet                                            |
| ------------------------------------ | -------------------------------------------------------- |
| `padding: 10px 20px;`                | `paddingVertical: 10, paddingHorizontal: 20`             |
| `margin: 0 auto;`                    | `alignSelf: 'center'`                                    |
| `display: flex; flex-direction: row;` | `flexDirection: 'row'` (column là mặc định)             |
| `gap: 10px;`                         | `gap: 10` (RN 0.71+)                                     |
| `text-decoration: line-through;`     | `textDecorationLine: 'line-through'`                     |
| `text-overflow: ellipsis; -webkit-line-clamp: 2` | `<Text numberOfLines={2}>...`                |
| `position: fixed;`                   | KHÔNG có — dùng `position: 'absolute'` + đặt trong root  |
| `:hover`, `:active`                  | KHÔNG có — dùng `TouchableOpacity activeOpacity`         |
| `box-shadow`                         | iOS: `shadowColor`, `shadowOpacity`, `shadowOffset`, `shadowRadius`. Android: `elevation`. Set cả hai. |
| `@media` query                       | KHÔNG có — dùng `useWindowDimensions()` hoặc `Platform`  |

**Layout flex:**

```tsx
// "Hai cột chia đôi, có khoảng cách giữa"
<View style={{ flexDirection: 'row', gap: 10 }}>
  <View style={{ flex: 1 }}>Cột trái</View>
  <View style={{ flex: 1 }}>Cột phải</View>
</View>

// "Item căn giữa cả 2 trục"
<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
  ...
</View>
```

### 4.3 Event — onPress thay onClick

| Web        | RN                       |
| ---------- | ------------------------ |
| `onClick`  | `onPress`                |
| `onChange` (input) | `onChangeText` (nhận string, không phải event) |
| `onKeyDown` | `onKeyPress` (giới hạn, ít dùng)  |
| `onScroll`  | `onScroll` (giống)        |

```tsx
<TextInput
  value={email}
  onChangeText={setEmail}  // nhận STRING trực tiếp
  // KHÔNG có: onChange={(e) => setEmail(e.target.value)}
/>
```

### 4.4 Danh sách dài: dùng `FlatList`, KHÔNG `array.map()`

```tsx
// ❌ KHÔNG nên với list dài
<ScrollView>
  {products.map((p) => <ProductCard key={p.id} product={p} />)}
</ScrollView>

// ✅ Dùng FlatList — chỉ render item trong viewport
<FlatList
  data={products}
  keyExtractor={(item) => item.id}
  numColumns={2}
  columnWrapperStyle={{ gap: 10 }}
  renderItem={({ item }) => <ProductCard product={item} />}
/>
```

FlatList có sẵn pull-to-refresh, infinite scroll, optimization. List < 20 item thì ScrollView vẫn OK.

### 4.5 Alert — popup thay window.alert

```tsx
import { Alert } from 'react-native';

Alert.alert(
  'Xoá đơn hàng?',
  'Bạn có chắc không?',
  [
    { text: 'Huỷ', style: 'cancel' },
    { text: 'Xoá', style: 'destructive', onPress: () => doDelete() },
  ],
);
```

Đây là dialog native, không phải `<div>` custom. Trên Android trông giống Material, iOS giống iOS native.

### 4.6 Image — bắt buộc width/height

```tsx
// ❌ Sẽ KHÔNG hiển thị (RN không biết kích thước ảnh remote)
<Image source={{ uri: url }} />

// ✅ Phải có size (width/height hoặc flex hoặc aspectRatio)
<Image source={{ uri: url }} style={{ width: 100, height: 100 }} />
<Image source={{ uri: url }} style={{ width: '100%', aspectRatio: 1 }} />
```

### 4.7 SafeAreaView — tránh notch tai thỏ

```tsx
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  ...
</SafeAreaView>
```

> Trong dự án này, React Navigation tự xử lý safe area cho header rồi — bạn chỉ cần SafeAreaView khi ẩn header.

---

## 5. Navigation

Dùng **React Navigation** thay React Router. Cách tư duy:

- **Stack Navigator** = ngăn xếp màn hình. Push lên, pop về. Có nút back.
- **Tab Navigator** = các tab ngang dưới đáy. Switch giữa các tab.
- Có thể **lồng** nhau: trong dự án này, RootStack chứa Tabs + nhiều screen khác.

### Cách di chuyển giữa các screen

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

function MyComponent() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Push screen mới
  navigation.navigate('ProductDetail', { id: '123' });

  // Quay lại screen trước
  navigation.goBack();

  // Replace (thay screen hiện tại, không thêm vào history)
  navigation.replace('Orders');

  // Reset toàn bộ stack về 1 screen
  navigation.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Tabs' }] })
  );
}
```

### Nhận params từ route

```tsx
import { useRoute, type RouteProp } from '@react-navigation/native';

function ProductDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const { id } = route.params; // type-safe
}
```

### Khai báo type cho navigator

Tất cả ở [src/navigation/types.ts](src/navigation/types.ts):

```ts
export type RootStackParamList = {
  Tabs: undefined;
  ProductDetail: { id: string };   // ← params bắt buộc
  Search: undefined;                // ← không có params
  // ...
};
```

Đăng ký 1 route mới → thêm vào type map + thêm `<Stack.Screen>` trong RootNavigator.

---

## 6. State management

Dự án này dùng **React Context** (không phải Redux). Vì state đơn giản:

- `AuthContext`: user, token, login/logout/register
- `CartContext`: items giỏ hàng

Cách dùng giống y React web:

```tsx
const { user, login, logout } = useAuth();
const { items, addToCart, total } = useCart();
```

### Persist vào AsyncStorage

`AsyncStorage` = `localStorage` nhưng **async**:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web (sync)
const token = localStorage.getItem('token');
localStorage.setItem('token', 'abc');

// RN (async — phải await)
const token = await AsyncStorage.getItem('token');
await AsyncStorage.setItem('token', 'abc');
```

**Quan trọng — pattern "hydrated":** khi mount component, ta cần đọc từ AsyncStorage trước, rồi mới ghi. Nếu không, render đầu sẽ ghi `[]` đè dữ liệu cũ. Xem [CartContext.tsx](src/store/CartContext.tsx) — cờ `hydrated`.

---

## 7. Gọi API + lưu token

Dùng **axios** — y hệt web. Khác duy nhất là URL phải tuyệt đối.

Xem [src/api/client.ts](src/api/client.ts):

```ts
const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Mỗi endpoint là một file trong `api/endpoints/`. Dùng như sau:

```tsx
import { productsApi } from '../api/endpoints/products';

const { data } = await productsApi.list({ category: 'trai-cay', limit: 20 });
```

API mapping với backend:

| Endpoint                      | File frontend                                       |
| ----------------------------- | --------------------------------------------------- |
| `POST /api/auth/login`        | [auth.ts](src/api/endpoints/auth.ts) `.login`       |
| `POST /api/auth/register`     | [auth.ts](src/api/endpoints/auth.ts) `.register`    |
| `GET /api/auth/me`            | [auth.ts](src/api/endpoints/auth.ts) `.me`          |
| `GET /api/products`           | [products.ts](src/api/endpoints/products.ts) `.list`|
| `GET /api/products/:id`       | [products.ts](src/api/endpoints/products.ts) `.get` |
| `GET /api/categories`         | [categories.ts](src/api/endpoints/categories.ts) `.list` |
| `GET /api/categories/tree`    | [categories.ts](src/api/endpoints/categories.ts) `.tree` |
| `GET /api/orders`             | [orders.ts](src/api/endpoints/orders.ts) `.list`    |
| `POST /api/orders`            | [orders.ts](src/api/endpoints/orders.ts) `.create`  |
| `PATCH /api/orders/:id/cancel` | [orders.ts](src/api/endpoints/orders.ts) `.cancel` |
| `PUT /api/users/:id`          | [users.ts](src/api/endpoints/users.ts) `.update`    |

---

## 8. Style & Layout

### Tổ chức style

Dự án dùng pattern: mỗi file component có 1 `StyleSheet.create({...})` ở cuối. KHÔNG có file CSS riêng.

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export function MyCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Title</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});
```

### Style động: array

```tsx
// Kết hợp nhiều style
<View style={[styles.card, isActive && styles.cardActive]} />

// Style động kết hợp StyleSheet + inline
<View style={[styles.card, { backgroundColor: dynamicColor }]} />
```

### Palette dùng chung

Đừng hard-code màu trong từng component. Dùng [src/theme/colors.ts](src/theme/colors.ts):

```ts
export const colors = {
  primary: '#16A34A',
  primaryDark: '#15803D',
  // ...
};
```

---

## 9. Hành trình trong app

Để hiểu file kết nối với nhau:

### Mở app lần đầu (chưa đăng nhập)

1. `App.tsx` → bọc Providers → `NavigationContainer` → `RootNavigator`
2. `RootNavigator` mặc định push `Tabs` → mở `HomeScreen`
3. `HomeScreen` gọi `productsApi.list()` + `categoriesApi.list()` qua [client.ts](src/api/client.ts)
4. axios interceptor đọc `AsyncStorage.getItem('token')` — không có → gửi request không có header

### Thêm sản phẩm vào giỏ

1. User tap `+` trên `ProductCard` → gọi `addToCart(product, 1)` từ `useCart()`
2. `CartContext` cập nhật `items` state → re-render
3. `useEffect` trong `CartContext` thấy `items` đổi → ghi vào `AsyncStorage`
4. `TabNavigator` re-render `CartTabIcon` (vì nó dùng `useCart()`) → badge đỏ hiện số mới

### Đặt hàng

1. User vào `Cart` tab → bấm "Thanh toán" → nếu chưa login, popup `Alert` yêu cầu đăng nhập
2. Bấm "Đăng nhập" → `navigation.navigate('Login')` (push stack)
3. Login thành công → `AuthContext.login()` → lưu token vào `AsyncStorage` → `navigation.goBack()`
4. Quay lại Cart → bấm "Thanh toán" → `navigation.navigate('Checkout')`
5. Điền form → bấm "Đặt hàng" → `ordersApi.create({...})`
6. axios interceptor tự đính header `Authorization: Bearer <token>`
7. Thành công → `clearCart()` → hiện success screen → nút "Xem đơn hàng" → `navigation.replace('Orders')`

---

## 10. Debug + lỗi thường gặp

### Mở DevTools

Trên Expo Dev menu (lắc thiết bị hoặc bấm `m` trong terminal):
- **Reload** — refresh app
- **Debug Remote JS** — mở Chrome DevTools để debug console.log
- **Element Inspector** — chọn element trên UI để xem hierarchy
- **Performance Monitor** — FPS + RAM

### Lỗi thường gặp

| Lỗi                                                                  | Nguyên nhân + fix                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Text strings must be rendered within a <Text> component`            | Có chuỗi text đặt thẳng vào `<View>`. Bọc vào `<Text>`.                                                      |
| `Network request failed` / `Network Error`                           | URL backend sai. Kiểm tra `app.json` → `extra.apiUrl`. Android emulator dùng `10.0.2.2`, không phải `localhost`. |
| App trắng xóa khi mở                                                 | Crash ở mount. Xem terminal Metro output. Thường do import sai hoặc Provider thiếu.                          |
| Ảnh không hiển thị                                                   | `<Image>` không có width/height. Thêm style.                                                                 |
| Bóng đổ không thấy trên Android                                      | Chỉ set `shadow*` (chỉ iOS). Phải thêm `elevation: 2`.                                                       |
| Modal không đóng bằng nút back Android                               | Thiếu prop `onRequestClose={() => setOpen(false)}`.                                                          |
| Tap vào `<TextInput disabled>` mở keyboard                           | Đừng dùng `TextInput` làm nút. Dùng `<Text>` bọc trong `TouchableOpacity`.                                   |
| Lỗi đỏ "Cannot find module 'react'" trong VS Code                    | Chưa chạy `npm install`. Chạy xong, restart VS Code (Ctrl+Shift+P → Reload Window).                          |
| `useNavigation` trả về undefined                                     | Component không nằm dưới `NavigationContainer`. Kiểm tra App.tsx.                                            |
| Bàn phím che input khi gõ                                            | Bọc form vào `<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`.              |

### console.log

```tsx
console.log('user:', user); // in ra terminal đang chạy `expo start`
```

Trên thiết bị thật, log vẫn hiện trong terminal Metro.

---

## 11. Build APK / IPA

### Build phát triển (dev) — dùng Expo Go

```bash
npm start
```

Quét QR bằng Expo Go. Không build file, chạy trên JS bundle.

### Build APK (Android) — qua EAS Build

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Sẽ build trên cloud của Expo (free tier có giới hạn), trả về link `.apk` để cài.

### Build IPA (iOS)

Cần Apple Developer Account ($99/năm) + cấu hình profile + cert.
```bash
eas build -p ios --profile preview
```

> Tóm lại: với mục đích DEMO/học, **chỉ cần Expo Go**, không cần build APK.

---

## 12. Cheatsheet

```tsx
// === IMPORTS hay dùng ===
import { View, Text, Image, ScrollView, FlatList,
  TouchableOpacity, TextInput, StyleSheet, Alert,
  ActivityIndicator, RefreshControl, Modal,
  KeyboardAvoidingView, Platform } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// === HOOKS hay dùng ===
useState, useEffect, useCallback, useMemo  // giống web
useNavigation()      // điều hướng
useRoute()           // params từ navigation

// === ĐIỀU HƯỚNG ===
navigation.navigate('Screen', { id: '123' })
navigation.goBack()
navigation.replace('Screen')

// === STORAGE ===
await AsyncStorage.setItem('key', JSON.stringify(value))
const raw = await AsyncStorage.getItem('key')
await AsyncStorage.removeItem('key')

// === GỌI API ===
import api from '../api/client';
const { data } = await api.get('/api/products', { params: { limit: 20 } });

// === ALERT ===
Alert.alert('Title', 'Message', [
  { text: 'Cancel', style: 'cancel' },
  { text: 'OK', onPress: () => doIt() },
]);

// === LAYOUT FLEX (mặc định COLUMN) ===
<View style={{ flex: 1, flexDirection: 'row',
  alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
  <View style={{ flex: 1 }} />
  <View style={{ flex: 1 }} />
</View>
```

---

## Câu hỏi thường gặp

**Q: Bao giờ thì cần học Swift / Kotlin?**
A: Khi cần truy cập feature native không có sẵn (Bluetooth, NFC tuỳ chỉnh, v.v.). Với app demo này, hoàn toàn không cần.

**Q: Tailwind có dùng được không?**
A: Có (`nativewind`), nhưng config phức tạp. Dự án này dùng `StyleSheet` cho đơn giản.

**Q: Sao không dùng Redux?**
A: Redux Toolkit chạy fine trên RN. Dự án này chọn Context vì state đơn giản. Nếu state phức tạp hơn (chat, real-time), thì Redux/Zustand sẽ hợp lý hơn.

**Q: Hot reload có không?**
A: Có, gọi là Fast Refresh — bật mặc định. Sửa code → app tự refresh giữ state.

**Q: Có thể debug bằng Chrome DevTools không?**
A: Có. Trong Expo Dev Menu → Debug Remote JS → mở Chrome ở `http://localhost:19000/debugger-ui`.

---

**Tiếp theo:** Mở [components/ProductCard.tsx](src/components/ProductCard.tsx) và đọc kèm với file này. Đó là một component RN đầy đủ với comment giải thích từng dòng.
