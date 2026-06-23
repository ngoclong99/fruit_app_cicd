// =============================================================================
// components/ProductCard.tsx — Card sản phẩm dùng trong grid 2 cột
// =============================================================================
// File này minh hoạ các pattern RN cơ bản — đọc kỹ nếu mới chuyển từ React.js:
//
//   <View>           ~ <div>      (container, layout flex mặc định column)
//   <Text>           ~ <span>     (BẮT BUỘC bọc mọi text content)
//   <Image source={{uri:...}}>  ~ <img src=...>
//   <TouchableOpacity onPress>   ~ <button onClick> (làm mờ khi tap)
//   StyleSheet.create({...})     ~ CSS classes (nhưng inline-only, camelCase)
//   onPress                       ~ onClick (mọi event là onXxx, camelCase)
//
// memo(): giống React.memo trên web — tránh re-render khi product không đổi.
// Quan trọng khi card xuất hiện 100 lần trong FlatList.
// =============================================================================

import { memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';
import { useCart } from '@/store/CartContext';
import Icon from './Icon';

interface Props {
  product: Product;
}

// Chip nhỏ ở góc trái card: NEW/SALE/HOT
function BadgeChip({ kind }: { kind: NonNullable<Product['badge']> }) {
  const palette: Record<typeof kind, { bg: string; text: string; label: string }> = {
    new: { bg: '#DBEAFE', text: '#1D4ED8', label: 'MỚI' },
    sale: { bg: '#FEE2E2', text: '#DC2626', label: 'SALE' },
    hot: { bg: '#FEF3C7', text: '#D97706', label: 'HOT' },
  };
  const p = palette[kind];
  return (
    <View style={[styles.badge, { backgroundColor: p.bg }]}>
      <Text style={[styles.badgeText, { color: p.text }]}>{p.label}</Text>
    </View>
  );
}

function ProductCard({ product }: Props) {
  // useNavigation: hook lấy navigation prop. Type ép cứng sang RootStack
  // để TS biết các route có thể navigate. Tương đương useNavigate() trên web.
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { addToCart } = useCart();

  // Tính phần trăm giảm giá để hiển thị tag "-X%" góc phải
  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0;

  return (
    // TouchableOpacity: nút có hiệu ứng mờ khi tap. activeOpacity = độ mờ tối thiểu.
    // onPress thay cho onClick — KHÔNG có onClick trong RN.
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.card}
      onPress={() =>
        // navigation.navigate('Tên Route', params)
        // Tương đương navigate('/products/123') trên react-router.
        navigation.navigate('ProductDetail', { id: product.id })
      }
    >
      {/* Vùng ảnh */}
      <View style={styles.imageWrap}>
        <Image
          // KHÁC <img src="...">: phải truyền object { uri } cho ảnh remote.
          // Ảnh local thì dùng require('./logo.png').
          source={{ uri: product.image }}
          style={styles.image}
          // resizeMode: cover/contain/stretch/center. Mặc định 'cover'.
          resizeMode="cover"
        />
        {product.badge && <BadgeChip kind={product.badge} />}
        {discount > 0 && (
          <View style={styles.discount}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}
      </View>

      {/* Vùng text */}
      <View style={styles.body}>
        {/* numberOfLines={2} = clamp 2 dòng + ellipsis. Tương đương
            -webkit-line-clamp: 2 trên CSS (nhưng đây là prop, không phải style). */}
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <View style={styles.metaRow}>
          <Icon name="star" size={12} />
          <Text style={styles.metaText}>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </Text>
        </View>
        <View style={styles.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.price}>{formatVnd(product.price)}</Text>
            {product.originalPrice ? (
              <Text style={styles.originalPrice}>
                {formatVnd(product.originalPrice)}
              </Text>
            ) : (
              <Text style={styles.unit}>{product.unit}</Text>
            )}
          </View>
          {/* Nút "+" thêm nhanh vào giỏ. e.stopPropagation không có ở RN —
              dùng cách: đặt onPress ở đây, TouchableOpacity cha sẽ KHÔNG nhận
              tap nếu con đã consume (mặc định). */}
          <TouchableOpacity
            onPress={() => addToCart(product, 1)}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// memo: tránh re-render khi prop product không đổi (ref-equal đủ vì product
// đến từ list state — chỉ thay đổi khi reload). Tăng FPS scroll danh sách dài.
export default memo(ProductCard);

const styles = StyleSheet.create({
  card: {
    flex: 1, // chiếm toàn bộ cell trong grid 2 cột
    backgroundColor: colors.card,
    borderRadius: 14,
    overflow: 'hidden', // bo ảnh theo border-radius (web: cần overflow:hidden cũng vậy)
    // Bóng đổ: iOS dùng shadowXxx, Android dùng elevation. Phải set CẢ HAI.
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1, // ảnh vuông — RN hỗ trợ aspectRatio native
    backgroundColor: colors.borderLight,
  },
  image: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9, fontWeight: '700' },
  discount: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.sale,
  },
  discountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  body: { padding: 10, gap: 4 }, // gap hoạt động trong View flex từ RN 0.71
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    minHeight: 34, // đảm bảo 2 dòng đều nhau giữa các card
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: colors.textMuted },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  price: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  originalPrice: {
    color: colors.textLight,
    fontSize: 11,
    textDecorationLine: 'line-through', // tương đương text-decoration: line-through
  },
  unit: { color: colors.textLight, fontSize: 11 },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
