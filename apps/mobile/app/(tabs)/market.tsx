import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, type MarketListingSummary } from '../../lib/api';
import { formatPrice, stripHtml } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

export default function MarketScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MarketListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: MarketListingSummary[] }>(
        '/api/market/listings?type=product&sort=latest&limit=20',
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '交易列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView label="正在加载交易中心..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>交易中心</Text>
          <Text style={styles.description}>最新交易帖，按商品卡浏览。</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.secondaryHeaderButton} onPress={() => router.push('/auctions')}>
            <Text style={styles.secondaryHeaderText}>拍卖</Text>
          </Pressable>
          <Pressable style={styles.sellButton} onPress={() => router.push('/market-sell')}>
            <Text style={styles.sellButtonText}>发布</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item) => {
          const product = item.products?.[0];
          const image = absoluteAssetUrl(product?.cover || item.cover);
          const price = product?.price ?? item.price;
          const desc = stripHtml(product?.description || item.description);
          return (
            <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/market/${item.id}`)}>
              {image ? <Image source={{ uri: image }} style={styles.cover} /> : <View style={styles.coverFallback} />}
              <View style={styles.cardBody}>
                <View style={styles.sellerRow}>
                  <Text numberOfLines={1} style={styles.seller}>
                    {item.seller?.name ?? '未知卖家'}
                  </Text>
                  {item.shipFrom ? <Text style={styles.shipFrom}>{item.shipFrom}</Text> : null}
                </View>
                <Text numberOfLines={2} style={styles.cardTitle}>{item.title}</Text>
                {desc ? <Text numberOfLines={2} style={styles.cardDesc}>{desc}</Text> : null}
                <View style={styles.productRow}>
                  <Text style={styles.price}>{formatPrice(price)}</Text>
                  <Text style={styles.meta}>{item.itemCount ?? item.products?.length ?? 1} 件商品</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.stat}>看 {item.views ?? 0}</Text>
                  <Text style={styles.stat}>评 {item.comments ?? 0}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  description: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  sellButton: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryHeaderButton: {
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryHeaderText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  sellButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  list: {
    gap: spacing.md,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    aspectRatio: 1.4,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    aspectRatio: 1.4,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  cardBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  seller: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  shipFrom: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  price: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    color: colors.muted,
    fontSize: 12,
  },
});
