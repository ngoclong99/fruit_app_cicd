import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {
  useRoute,
  useNavigation,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productsApi } from '@/api/endpoints/products';
import { colors } from '@/theme/colors';
import { formatVnd } from '@/utils/format';
import { useCart } from '@/store/CartContext';
import Icon from '@/components/Icon';
import Button from '@/components/Button';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

const TRUST_BADGES = [
  { icon: '🚚', label: 'Giao trong ngày' },
  { icon: '🔄', label: 'Đổi trả 24h' },
  { icon: '🛡️', label: 'Tươi đảm bảo' },
];

function badgePalette(kind: NonNullable<Product['badge']>) {
  switch (kind) {
    case 'sale':
      return { bg: '#EF4444', text: '#fff', label: 'SALE' };
    case 'hot':
      return { bg: '#F97316', text: '#fff', label: 'HOT' };
    default:
      return { bg: '#3B82F6', text: '#fff', label: 'NEW' };
  }
}

export default function ProductDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ProductDetail'>>();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = route.params;
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveImg(0);
    setQty(1);
    productsApi
      .get(id)
      .then(async (p) => {
        setProduct(p);
        try {
          const r = await productsApi.list({ category: p.category, limit: 5 });
          setRelated(r.data.filter((x) => x.id !== p.id).slice(0, 4));
        } catch {
          setRelated([]);
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 48 }}>😢</Text>
        <Text style={{ color: colors.textMuted, marginTop: 8 }}>
          Không tìm thấy sản phẩm
        </Text>
      </View>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];

  const discount = product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100,
      )
    : 0;

  const outOfStock = product.stock === 0;

  const handleAdd = () => {
    if (outOfStock) return;
    addToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    addToCart(product, qty);
    navigation.navigate('Checkout');
  };

  const palette = product.badge ? badgePalette(product.badge) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Image
          source={{ uri: images[activeImg] }}
          style={styles.hero}
          resizeMode="cover"
        />
        {images.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbRow}
          >
            {images.map((src, i) => (
              <TouchableOpacity
                key={`${src}-${i}`}
                onPress={() => setActiveImg(i)}
                style={[
                  styles.thumbWrap,
                  i === activeImg && styles.thumbWrapActive,
                ]}
              >
                <Image source={{ uri: src }} style={styles.thumb} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.body}>
          <View style={styles.chipsRow}>
            <View style={styles.originChip}>
              <Text style={styles.originChipText}>📍 {product.origin}</Text>
            </View>
            {palette && (
              <View
                style={[styles.badge, { backgroundColor: palette.bg }]}
              >
                <Text style={[styles.badgeText, { color: palette.text }]}>
                  {product.badge === 'sale' && discount > 0
                    ? `-${discount}%`
                    : palette.label}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>
              {'★'.repeat(Math.round(product.rating))}
              <Text style={{ color: colors.borderLight }}>
                {'★'.repeat(5 - Math.round(product.rating))}
              </Text>
            </Text>
            <Text style={styles.ratingValue}>{product.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>
              ({product.reviewCount} đánh giá)
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatVnd(product.price)}</Text>
            <Text style={styles.priceUnit}>/{product.unit}</Text>
            {product.originalPrice ? (
              <Text style={styles.originalPrice}>
                {formatVnd(product.originalPrice)}
              </Text>
            ) : null}
          </View>

          {product.originalPrice ? (
            <View style={styles.saveBanner}>
              <Text style={styles.saveText}>
                Tiết kiệm{' '}
                {formatVnd(product.originalPrice - product.price)} ({discount}%)
              </Text>
            </View>
          ) : null}

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tình trạng</Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: outOfStock ? colors.danger : colors.primary },
                ]}
              >
                {outOfStock ? 'Hết hàng' : `Còn ${product.stock} ${product.unit}`}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Xuất xứ</Text>
              <Text style={styles.infoValue}>{product.origin}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Đơn vị</Text>
              <Text style={styles.infoValue}>{product.unit}</Text>
            </View>
          </View>

          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Số lượng</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Icon name="minus" size={14} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{qty}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() =>
                  setQty((q) => Math.min(product.stock || q + 1, q + 1))
                }
              >
                <Icon name="plus" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.trustRow}>
            {TRUST_BADGES.map((b) => (
              <View key={b.label} style={styles.trustItem}>
                <Text style={styles.trustIcon}>{b.icon}</Text>
                <Text style={styles.trustLabel}>{b.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả sản phẩm</Text>
            <Text style={styles.description}>{product.description}</Text>
            {product.tags && product.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {product.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {related.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sản phẩm liên quan</Text>
              <View style={styles.relatedGrid}>
                {related.map((r) => (
                  <View key={r.id} style={styles.relatedItem}>
                    <ProductCard product={r} />
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addBtn,
            added && { backgroundColor: colors.primary, borderColor: colors.primary },
            outOfStock && { opacity: 0.5 },
          ]}
          disabled={outOfStock}
          onPress={handleAdd}
        >
          <Icon
            name={added ? 'check' : 'cart'}
            size={16}
            color={added ? '#fff' : colors.primary}
          />
          <Text
            style={[
              styles.addBtnText,
              added && { color: '#fff' },
            ]}
          >
            {added ? 'Đã thêm' : 'Thêm vào giỏ'}
          </Text>
        </TouchableOpacity>
        <Button
          title={outOfStock ? 'Hết hàng' : 'Mua ngay'}
          onPress={handleBuyNow}
          disabled={outOfStock}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hero: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.borderLight,
  },
  thumbRow: { gap: 8, padding: 12, backgroundColor: '#fff' },
  thumbWrap: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbWrapActive: { borderColor: colors.primary },
  thumb: { width: 56, height: 56 },
  body: { padding: 16, gap: 8 },
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  originChip: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  originChipText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  name: { fontSize: 20, fontWeight: '800', color: colors.text },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stars: { color: '#FBBF24', fontSize: 14, letterSpacing: 1 },
  ratingValue: { color: colors.text, fontWeight: '700', fontSize: 13 },
  reviewCount: { color: colors.textLight, fontSize: 12 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  price: { color: colors.primaryDark, fontSize: 26, fontWeight: '800' },
  priceUnit: { color: colors.textLight, fontSize: 13 },
  originalPrice: {
    color: colors.textLight,
    fontSize: 14,
    textDecorationLine: 'line-through',
    marginLeft: 4,
  },
  saveBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  saveText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
  infoBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: 10,
    marginTop: 10,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  infoLabel: { width: 90, color: colors.textMuted, fontSize: 13 },
  infoValue: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  qtyLabel: { color: colors.text, fontWeight: '600' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  stepBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    width: 40,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  trustItem: {
    flex: 1,
    backgroundColor: colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  trustIcon: { fontSize: 18, marginBottom: 2 },
  trustLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  description: { color: colors.textMuted, lineHeight: 20, fontSize: 13 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: { color: colors.primaryDark, fontSize: 11, fontWeight: '600' },
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  relatedItem: { width: '48%' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#fff',
  },
  addBtnText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
});
