# Fresh Mart — Mobile (Expo React Native)

App React Native (TypeScript) cho cùng backend với bản web ở `../backend`.
UI lấy cảm hứng từ phiên bản mobile của trang web: bottom tabs, card sản phẩm 2 cột, hero gradient xanh.

## Cấu trúc

```
mobile/
├─ App.tsx                  ← root: providers + NavigationContainer
├─ app.json                 ← cấu hình Expo (chỉnh `extra.apiUrl` ở đây)
├─ src/
│  ├─ api/
│  │  ├─ client.ts          ← axios instance + interceptor đính kèm token
│  │  └─ endpoints/         ← auth, products, categories, orders
│  ├─ components/           ← ProductCard, Button, Icon, EmptyState
│  ├─ navigation/           ← RootNavigator (stack) + TabNavigator (bottom tabs)
│  ├─ screens/              ← Home, Products, Drinks, Cart, Checkout, Orders, Profile, Login, Register, Search, ProductDetail
│  ├─ store/                ← AuthContext + CartContext (lưu vào AsyncStorage)
│  ├─ theme/colors.ts
│  ├─ types/                ← User, Product, Order, Category, CartItem
│  └─ utils/format.ts
```

## Cài đặt

```bash
cd mobile
npm install
```

> Lần đầu chạy có thể mất vài phút để pull các native package.

## Cấu hình API URL

Backend chạy tại `http://localhost:5000` trên máy dev — nhưng **emulator / thiết bị thật KHÔNG** thấy `localhost`. Chọn 1 trong các option dưới và đặt vào `app.json` ở field `expo.extra.apiUrl` (hoặc set env `EXPO_PUBLIC_API_URL`):

| Môi trường                | API URL nên dùng                          |
| ------------------------- | ----------------------------------------- |
| **Android Emulator**      | `http://10.0.2.2:5000`                    |
| **iOS Simulator (macOS)** | `http://localhost:5000`                   |
| **Thiết bị thật (Expo Go)** | `http://<LAN-IP-máy-dev>:5000` (ví dụ `http://192.168.1.10:5000`) |
| **Backend đã deploy**     | `https://api.your-domain.com`             |

`app.json` mặc định đang trỏ `http://10.0.2.2:5000` (Android emulator).

Cách tìm LAN IP trên Windows (PowerShell):

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like 'Wi-Fi*' -or $_.InterfaceAlias -like 'Ethernet*' } | Select-Object IPAddress, InterfaceAlias
```

> Lưu ý: backend cần `CORS_ORIGIN` cho phép request từ mobile, hoặc tắt CORS check khi chạy local — vì axios trên RN không gửi `Origin` mặc định nên thường không sao.

## Chạy backend trước

```bash
cd ../backend
npm install
npm run dev    # mặc định lắng nghe http://0.0.0.0:5000
```

## Chạy mobile

```bash
cd mobile
npm start                  # mở Expo Dev Tools
# hoặc trực tiếp:
npm run android            # Android emulator
npm run ios                # iOS simulator (macOS)
```

Trên Windows nhanh nhất là:

1. Mở **Android Studio → Device Manager → Start** một emulator.
2. `cd mobile && npm run android`.

Hoặc cài app **Expo Go** trên điện thoại, quét QR code từ Expo Dev Tools (cần API URL = LAN IP của máy dev).

## Tính năng

- [x] Trang chủ: hero, danh mục, sản phẩm khuyến mãi, tab theo danh mục
- [x] Danh sách sản phẩm: lọc theo danh mục, tìm kiếm (debounce), sắp xếp
- [x] Chi tiết sản phẩm: ảnh đa hình, chọn số lượng, thêm vào giỏ / Mua ngay
- [x] Nước ép: shortcut tới danh mục `nuoc-ep`
- [x] Tìm kiếm: full-text qua API `/api/products?search=`
- [x] Giỏ hàng: thêm/sửa/xoá, lưu vào AsyncStorage, phí ship tự động
- [x] Thanh toán: tạo đơn `POST /api/orders`, yêu cầu đăng nhập
- [x] Đơn hàng của tôi: list + huỷ đơn pending/confirmed
- [x] Tài khoản: đăng nhập, đăng ký, đăng xuất, hiển thị thông tin

## Endpoint backend đang dùng

| Endpoint                      | Mô tả                  |
| ----------------------------- | ---------------------- |
| `POST /api/auth/login`        | Đăng nhập              |
| `POST /api/auth/register`     | Đăng ký                |
| `GET  /api/auth/me`           | Lấy user hiện tại      |
| `GET  /api/products`          | Danh sách sản phẩm     |
| `GET  /api/products/:id`      | Chi tiết sản phẩm      |
| `GET  /api/categories`        | Danh sách danh mục     |
| `GET  /api/categories/tree`   | Cây danh mục (3 cấp)   |
| `GET  /api/orders`            | Đơn hàng của tôi       |
| `POST /api/orders`            | Tạo đơn                |
| `PATCH /api/orders/:id/cancel`| Huỷ đơn                |
