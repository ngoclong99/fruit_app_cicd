// =============================================================================
// screens/ProductsScreen.tsx — Danh sách sản phẩm (Tab 2)
// =============================================================================
// Đây là màn list LỚN, nên dùng FlatList thay ScrollView:
//   - ScrollView: render hết một lúc → list dài 1000 item làm app đứng.
//   - FlatList  : "virtualization" — chỉ render item đang/sắp lên màn. Cực nhanh.
//     KEY: data + keyExtractor + renderItem.
//
// Pattern khác trên màn này:
//   - Modal: pop-up từ dưới lên — RN có sẵn <Modal animationType="slide">.
//           Lưu ý: backdrop tap để dismiss cần TouchableOpacity riêng.
//   - "Pending state" cho filter: state TẠM trong khi user chỉnh chip,
//     chỉ apply (đẩy sang state thật) khi bấm "Áp dụng". Giống Drawer trên web.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { productsApi } from '../api/endpoints/products';
import { categoriesApi } from '../api/endpoints/categories';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { colors } from '../theme/colors';
import { formatVnd } from '../utils/format';
import type { Category, Product } from '../types';
import type { TabParamList } from '../navigation/types';

const SORTS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp' },
  { value: 'price_desc', label: 'Giá cao' },
  { value: 'rating', label: 'Đánh giá' },
  { value: 'newest', label: 'Mới nhất' },
];

const PRICE_PRESETS: { min: number; max: number; label: string }[] = [
  { min: 0, max: 100000, label: 'Dưới 100k' },
  { min: 100000, max: 300000, label: '100k – 300k' },
  { min: 300000, max: 600000, label: '300k – 600k' },
  { min: 600000, max: 1000000, label: 'Trên 600k' },
];

function findCatPath(tree: Category[], slug: string): Category[] {
  for (const l1 of tree) {
    if (l1.slug === slug) return [l1];
    for (const l2 of l1.children ?? []) {
      if (l2.slug === slug) return [l1, l2];
      for (const l3 of l2.children ?? []) {
        if (l3.slug === slug) return [l1, l2, l3];
      }
    }
  }
  return [];
}

export default function ProductsScreen() {
  const route = useRoute<RouteProp<TabParamList, 'Products'>>();
  const initialCat = route.params?.cat ?? '';

  const [cat, setCat] = useState(initialCat);
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000000]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tree, setTree] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // pending state for filter modal
  const [pendingCat, setPendingCat] = useState(cat);
  const [pendingPrice, setPendingPrice] =
    useState<[number, number]>(priceRange);

  useEffect(() => {
    categoriesApi
      .tree()
      .then(setTree)
      .catch(() => setTree([]));
  }, []);

  useEffect(() => {
    setCat(route.params?.cat ?? '');
  }, [route.params?.cat]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({
        category: cat || undefined,
        search: debounced || undefined,
        sort: sort === 'default' ? undefined : sort,
        limit: 100,
      });
      setProducts(res.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [cat, debounced, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredTree = useMemo(
    () => tree.filter((c) => c.slug !== 'nuoc-ep'),
    [tree],
  );

  const catPath = useMemo(
    () => findCatPath(filteredTree, cat),
    [filteredTree, cat],
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (p) => p.price >= priceRange[0] && p.price <= priceRange[1],
      ),
    [products, priceRange],
  );

  const openFilter = () => {
    setPendingCat(cat);
    setPendingPrice(priceRange);
    setFilterOpen(true);
  };

  const applyFilter = () => {
    setCat(pendingCat);
    setPriceRange(pendingPrice);
    setFilterOpen(false);
  };

  const clearFilter = () => {
    setPendingCat('');
    setPendingPrice([0, 1000000]);
  };

  const isPriceDefault = priceRange[0] === 0 && priceRange[1] === 1000000;
  const appliedCount = (cat ? 1 : 0) + (isPriceDefault ? 0 : 1);

  const pendingCatPath = useMemo(
    () => findCatPath(filteredTree, pendingCat),
    [filteredTree, pendingCat],
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Icon name="search" size={14} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm sản phẩm..."
          placeholderTextColor={colors.textLight}
          style={styles.searchInput}
        />
        <TouchableOpacity style={styles.filterBtn} onPress={openFilter}>
          <Text style={styles.filterBtnText}>Lọc</Text>
          {appliedCount > 0 && (
            <View style={styles.filterCount}>
              <Text style={styles.filterCountText}>{appliedCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catsScroll}
        contentContainerStyle={styles.cats}
      >
        <TouchableOpacity
          style={[styles.chip, cat === '' && styles.chipActive]}
          onPress={() => setCat('')}
        >
          <Text style={[styles.chipText, cat === '' && styles.chipTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>
        {filteredTree.map((c) => {
          const active = catPath[0]?.slug === c.slug;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setCat(c.slug)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {c.icon} {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortScroll}
        contentContainerStyle={styles.sorts}
      >
        {SORTS.map((o) => (
          <TouchableOpacity
            key={o.value}
            style={[styles.sortChip, sort === o.value && styles.sortChipActive]}
            onPress={() => setSort(o.value)}
          >
            <Text
              style={[
                styles.sortText,
                sort === o.value && styles.sortTextActive,
              ]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {catPath.length > 0
            ? catPath.map((c) => `${c.icon} ${c.name}`).join(' › ')
            : 'Tất cả sản phẩm'}
        </Text>
        <Text style={styles.countNumber}>{filtered.length} sản phẩm</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="Không tìm thấy sản phẩm"
          subtitle="Hãy thử từ khoá hoặc danh mục khác"
        />
      ) : (
        // FlatList grid 2 cột:
        //   - numColumns={2}: chia mỗi row 2 item
        //   - columnWrapperStyle: style cho ROW (gap giữa 2 item, padding ngang)
        //   - contentContainerStyle: style cho TOÀN BỘ vùng nội dung
        //   - renderItem nhận { item, index, separators } — chỉ dùng item ở đây
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{
            gap: 10,
            paddingVertical: 12,
            paddingBottom: 28,
          }}
          renderItem={({ item }) => (
            // Mỗi item bọc View flex:1 để 2 cột chia đều width khi card
            // không có width cố định.
            <View style={{ flex: 1 }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}

      {/* Modal filter (bottom sheet):
          - transparent: nền trong suốt, ta tự vẽ overlay đen mờ.
          - animationType="slide": trượt lên từ dưới.
          - onRequestClose: BẮT BUỘC trên Android — xử lý nút back vật lý. */}
      <Modal
        visible={filterOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setFilterOpen(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Bộ lọc</Text>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {(pendingCat || pendingPrice[0] !== 0 || pendingPrice[1] !== 1000000) && (
                <TouchableOpacity onPress={clearFilter}>
                  <Text style={styles.clearText}>Xoá tất cả</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalSection}>Danh mục</Text>
            <View style={styles.chipsWrap}>
              <TouchableOpacity
                style={[
                  styles.modalChip,
                  pendingCat === '' && styles.modalChipActive,
                ]}
                onPress={() => setPendingCat('')}
              >
                <Text
                  style={[
                    styles.modalChipText,
                    pendingCat === '' && styles.modalChipTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {filteredTree.map((c) => {
                const active = pendingCatPath[0]?.slug === c.slug;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.modalChip,
                      active && styles.modalChipActive,
                    ]}
                    onPress={() => setPendingCat(c.slug)}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        active && styles.modalChipTextActive,
                      ]}
                    >
                      {c.icon} {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {pendingCatPath[0]?.children &&
              pendingCatPath[0].children.length > 0 && (
                <>
                  <Text
                    style={[styles.modalSection, { marginTop: 16 }]}
                  >
                    {pendingCatPath[0].icon} {pendingCatPath[0].name}
                  </Text>
                  <View style={styles.chipsWrap}>
                    {pendingCatPath[0].children.map((c) => {
                      const active = pendingCat === c.slug;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.modalChip,
                            active && styles.modalChipActive,
                          ]}
                          onPress={() => setPendingCat(c.slug)}
                        >
                          <Text
                            style={[
                              styles.modalChipText,
                              active && styles.modalChipTextActive,
                            ]}
                          >
                            {c.icon} {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

            <Text style={[styles.modalSection, { marginTop: 16 }]}>
              Khoảng giá
            </Text>
            <View style={styles.chipsWrap}>
              {PRICE_PRESETS.map((p) => {
                const active =
                  pendingPrice[0] === p.min && pendingPrice[1] === p.max;
                return (
                  <TouchableOpacity
                    key={p.label}
                    style={[
                      styles.modalChip,
                      active && styles.modalChipActive,
                    ]}
                    onPress={() => setPendingPrice([p.min, p.max])}
                  >
                    <Text
                      style={[
                        styles.modalChipText,
                        active && styles.modalChipTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.priceSummary}>
              {pendingPrice[0] === 0 && pendingPrice[1] === 1000000
                ? 'Tất cả mức giá'
                : `${formatVnd(pendingPrice[0])} – ${formatVnd(pendingPrice[1])}`}
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Huỷ"
              variant="outline"
              onPress={() => setFilterOpen(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Áp dụng"
              onPress={applyFilter}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    margin: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
    paddingVertical: 4,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterBtnText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 12,
  },
  filterCount: {
    backgroundColor: colors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  catsScroll: { maxHeight: 50 },
  cats: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: '#fff' },
  sortScroll: { maxHeight: 42 },
  sorts: { paddingHorizontal: 12, gap: 8, paddingBottom: 6 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  sortText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  sortTextActive: { color: colors.primaryDark },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  countText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  countNumber: { color: colors.textLight, fontSize: 11 },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  clearText: { color: colors.danger, fontSize: 12, fontWeight: '600' },
  modalBody: { paddingHorizontal: 18, paddingVertical: 14 },
  modalSection: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  modalChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalChipText: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  modalChipTextActive: { color: '#fff', fontWeight: '700' },
  priceSummary: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});
