import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { productsApi } from '@/api/endpoints/products';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import Icon from '@/components/Icon';
import { colors } from '@/theme/colors';
import type { Product } from '@/types';

export default function SearchScreen() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    if (debounced.length < 2) {
      setProducts([]);
      return;
    }
    setLoading(true);
    try {
      const res = await productsApi.list({ search: debounced, limit: 100 });
      setProducts(res.data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const showResults = debounced.length >= 2;

  return (
    <View style={styles.container}>
      <View style={styles.searchWrap}>
        <Icon name="search" size={14} color={colors.textMuted} />
        <TextInput
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm trái cây, rau củ, nước ép..."
          placeholderTextColor={colors.textLight}
          style={styles.searchInput}
        />
      </View>

      {showResults && !loading && (
        <Text style={styles.resultText}>
          Kết quả: {products.length} sản phẩm cho “{debounced}”
        </Text>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !showResults ? (
        <EmptyState
          icon="🍎"
          title="Tìm kiếm sản phẩm"
          subtitle="Nhập ít nhất 2 ký tự để bắt đầu"
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="😢"
          title="Không tìm thấy kết quả"
          subtitle={`Không có sản phẩm khớp với "${debounced}"`}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
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
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  resultText: {
    color: colors.textMuted,
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
