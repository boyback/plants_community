import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import { absoluteAssetUrl, apiGet, type CollectionSummary } from '../lib/api';
import { formatPrice } from '../lib/format';
import { colors, spacing } from '../lib/theme';

type Mode = 'posts' | 'market';
type Item =
  | { kind: 'post'; id: string; title: string; desc?: string; cover?: string | null; meta: string; target: string }
  | { kind: 'market'; id: string; title: string; desc?: string; cover?: string | null; meta: string; target: string; price: number };

const modes: { key: Mode; label: string }[] = [
  { key: 'posts', label: '帖子' },
  { key: 'market', label: '商品' },
];

export default function CollectionsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('posts');
  const [data, setData] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await apiGet<CollectionSummary>('/api/mobile/collections');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '收藏加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    if (mode === 'posts') {
      return data.posts.map(({ post }) => ({
        kind: 'post',
        id: post.id,
        title: post.title,
        desc: post.contentText,
        cover: post.cover || post.images?.[0],
        meta: `${post.board?.name ?? '社区'} · 评 ${post.comments ?? 0} · 赞 ${post.likes ?? 0}`,
        target: `/post/${post.id}`,
      }));
    }
    return data.marketItems.map(({ item }) => ({
      kind: 'market',
      id: item.id,
      title: item.title,
      desc: item.description,
      cover: item.cover || item.images[0],
      meta: `${item.listing.title} · 库存 ${item.stock}`,
      target: `/market/${item.listingId}`,
      price: item.price,
    }));
  }, [data, mode]);

  if (loading) return <LoadingView label="正在加载收藏..." />;
  if (error && !data) return <ErrorView message={error} onRetry={() => load()} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListHeaderComponent={
        <View style={styles.segmented}>
          {modes.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setMode(item.key)}
              style={[styles.segment, mode === item.key && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === item.key && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无收藏</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(item.target)}>
          {absoluteAssetUrl(item.cover) ? (
            <Image source={{ uri: absoluteAssetUrl(item.cover)! }} style={styles.cover} />
          ) : (
            <View style={styles.coverFallback} />
          )}
          <View style={styles.cardBody}>
            <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
            {item.desc ? <Text numberOfLines={2} style={styles.desc}>{item.desc}</Text> : null}
            <View style={styles.bottomRow}>
              <Text numberOfLines={1} style={styles.meta}>{item.meta}</Text>
              {item.kind === 'market' ? <Text style={styles.price}>{formatPrice(item.price)}</Text> : null}
            </View>
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: 14,
    backgroundColor: '#eaf1e7',
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 11,
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.leaf,
  },
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    height: 116,
    width: 116,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    height: 116,
    width: 116,
    backgroundColor: colors.leafSoft,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomRow: {
    marginTop: 'auto',
    gap: 2,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
