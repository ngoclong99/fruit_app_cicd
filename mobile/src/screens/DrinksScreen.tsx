import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { productsApi } from '../api/endpoints/products';
import { categoriesApi } from '../api/endpoints/categories';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import type { Category, Product } from '../types';

const SORTS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price_asc', label: 'Giá thấp' },
  { value: 'price_desc', label: 'Giá cao' },
  { value: 'rating', label: 'Đánh giá' },
];

export default function DrinksScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [subs, setSubs] = useState<Category[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [sort, setSort] = useState('default');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoriesApi
      .tree()
      .then((tree) => {
        const nuoc = tree.find((c) => c.slug === 'nuoc-ep');
        setSubs(nuoc?.children ?? []);
      })
      .catch(() => setSubs([]));
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const res = await productsApi.list({ category: 'nuoc-ep', limit: 200 });
      setProducts(res.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSub = useCallback((slug: string) => {
    setSelectedSubs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedSubs.length > 0) {
      list = list.filter((p) => selectedSubs.includes(p.category));
    }
    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, selectedSubs, debounced, sort]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>🥤 Nước ép</Text>
      </View>

      <View style={styles.tagBox}>
        {selectedSubs.length === 0 ? (
          <Text style={styles.tagHint}>Chọn loại nước ép</Text>
        ) : (
          <View style={styles.tagsRow}>
            {selectedSubs.map((slug) => {
              const cat = subs.find((c) => c.slug === slug);
              return (
                <View key={slug} style={styles.tag}>
                  <Text style={styles.tagText}>
                    {cat ? `${cat.icon} ${cat.name}` : slug}
                  </Text>
                  <TouchableOpacity onPress={() => toggleSub(slug)}>
                    <Text style={styles.tagClose}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.subRow}
      >
        {subs
          .filter((c) => !selectedSubs.includes(c.slug))
          .map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.subChip}
              onPress={() => toggleSub(c.slug)}
            >
              <Text style={styles.subChipText}>
                {c.icon} {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        {selectedSubs.length > 0 && (
          <TouchableOpacity
            style={styles.clearChip}
            onPress={() => setSelectedSubs([])}
          >
            <Text style={styles.clearChipText}>Xoá bộ lọc</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={14} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm trong nước ép..."
            placeholderTextColor={colors.textLight}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
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

      <Text style={styles.countText}>{filtered.length} sản phẩm</Text>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🥤"
          title="Không tìm thấy sản phẩm"
          subtitle="Hãy thử bộ lọc khác"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{
            gap: 10,
            paddingBottom: 28,
            paddingTop: 6,
          }}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerBlock: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  tagBox: {
    marginHorizontal: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    minHeight: 40,
    justifyContent: 'center',
  },
  tagHint: { color: colors.textLight, fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tagClose: { color: '#fff', fontSize: 14, paddingHorizontal: 4 },
  subRow: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4, gap: 6 },
  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
  },
  subChipText: { color: colors.textMuted, fontSize: 11 },
  clearChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearChipText: { color: colors.danger, fontSize: 11, fontWeight: '600' },
  searchRow: { paddingHorizontal: 12, marginTop: 6 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
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
  sorts: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
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
  countText: {
    paddingHorizontal: 16,
    color: colors.textLight,
    fontSize: 11,
  },
});
