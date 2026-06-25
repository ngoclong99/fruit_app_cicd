// =============================================================================
// screens/HomeScreen.tsx — Trang chủ
// =============================================================================
// Một "screen" trong RN giống một page trên React web — nhưng KHÔNG có route
// path, được mount khi navigator chuyển tới tab/route tương ứng.
//
// Trên trang này có 3 patterns RN cốt lõi:
//   1) ScrollView    : container có thể cuộn dọc (giống <div style="overflow:auto">)
//                      Dùng cho nội dung CỐ ĐỊNH, ít item. Render hết một lần.
//   2) RefreshControl: pull-to-refresh "kéo xuống refresh" — pattern native mobile.
//   3) Grid bằng     : RN không có grid CSS. Dùng View + flexDirection:row + flexWrap.
//      flex-wrap
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { productsApi } from '@/api/endpoints/products';
import { categoriesApi } from '@/api/endpoints/categories';
import ProductCard from '@/components/ProductCard';
import Icon from '@/components/Icon';
import { colors } from '@/theme/colors';
import type { Category, Product } from '@/types';
import type { RootStackParamList } from '@/navigation/types';

const BENEFITS = [
  { icon: '🌱', title: 'Tươi 100%', color: '#DCFCE7', textColor: '#15803D' },
  { icon: '⚡', title: 'Giao nhanh', color: '#FFEDD5', textColor: '#C2410C' },
  { icon: '✅', title: 'Chất lượng', color: '#DBEAFE', textColor: '#1D4ED8' },
  { icon: '💰', title: 'Giá tốt', color: '#F3E8FF', textColor: '#7E22CE' },
];

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch song song products + categories. Tương đương web dùng axios.
  // RN không có fetch credentials/CORS issues — đơn giản hơn web.
  const load = useCallback(async () => {
    try {
      const [res, cats] = await Promise.all([
        productsApi.list({ limit: 100 }),
        categoriesApi.list(),
      ]);
      setProducts(res.data);
      setCategories(cats);
    } catch {
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const sale = useMemo(
    () => products.filter((p) => p.badge === 'sale').slice(0, 4),
    [products],
  );

  const filtered = useMemo(
    () =>
      activeTab === 'all'
        ? products.slice(0, 8)
        : products.filter((p) => p.category === activeTab).slice(0, 8),
    [activeTab, products],
  );

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.slug !== 'nuoc-ep'),
    [categories],
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    // ScrollView có 2 prop style đáng lưu ý:
    //   - style          : style của chính ScrollView (container, flex layout)
    //   - contentContainerStyle: style của inner View bọc nội dung (padding, gap)
    // Dùng nhầm padding vào style sẽ không hoạt động đúng — luôn padding ở
    // contentContainerStyle.
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={
        // Kéo xuống đầu để refresh — pattern native cực kỳ thông dụng.
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Tươi mỗi ngày</Text>
        <Text style={styles.heroTitleAccent}>Khoẻ mỗi ngày</Text>
        <Text style={styles.heroSubtitle}>
          Trái cây · Rau củ · Nước ép tươi
        </Text>
        {/* RN tip: Không dùng <TextInput disabled> để làm "nút mở search".
            TextInput trên Android vẫn có thể chiếm tap. Dùng Text giả lập
            placeholder bên trong TouchableOpacity là chắc chắn nhất. */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search')}
          style={styles.searchBox}
        >
          <Icon name="search" size={14} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Tìm kiếm sản phẩm...</Text>
        </TouchableOpacity>
      </View>

      {/* Benefits row */}
      <View style={styles.benefitsRow}>
        {BENEFITS.map((b) => (
          <View key={b.title} style={styles.benefitItem}>
            <View
              style={[styles.benefitIcon, { backgroundColor: b.color }]}
            >
              <Text style={{ fontSize: 18 }}>{b.icon}</Text>
            </View>
            <Text style={[styles.benefitLabel, { color: b.textColor }]}>
              {b.title}
            </Text>
          </View>
        ))}
      </View>

      {/* Categories scroller */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh mục</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {rootCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('Tabs', {
                  screen: 'Products',
                  params: { cat: c.slug },
                })
              }
              style={styles.categoryChip}
            >
              <Text style={styles.categoryIcon}>{c.icon}</Text>
              <Text style={styles.categoryLabel}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sale */}
      {sale.length > 0 && (
        <View style={[styles.section, styles.saleSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏷️ Khuyến mãi</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('Tabs', {
                  screen: 'Products',
                })
              }
            >
              <Text style={styles.sectionLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {sale.map((p) => (
              <View key={p.id} style={styles.gridItem}>
                <ProductCard product={p} />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Filter tabs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sản phẩm</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('all')}
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'all' && styles.tabTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {rootCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setActiveTab(c.slug)}
              style={[styles.tab, activeTab === c.slug && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === c.slug && styles.tabTextActive,
                ]}
              >
                {c.icon} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.grid}>
          {filtered.map((p) => (
            <View key={p.id} style={styles.gridItem}>
              <ProductCard product={p} />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() =>
            navigation.navigate('Tabs', { screen: 'Products' })
          }
        >
          <Text style={styles.viewAllText}>Xem tất cả sản phẩm</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 26,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroTitleAccent: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 6,
  },
  searchBox: {
    marginTop: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  benefitsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  saleSection: {
    backgroundColor: colors.saleBg,
    marginTop: 4,
    paddingBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryRow: {
    gap: 10,
    paddingRight: 10,
  },
  categoryChip: {
    width: 78,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  categoryIcon: {
    fontSize: 26,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabsRow: {
    gap: 8,
    paddingRight: 10,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  tabTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    width: '48%',
  },
  viewAllBtn: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#fff',
    fontWeight: '700',
  },
});
