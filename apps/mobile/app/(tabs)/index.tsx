import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, type MarketListingSummary, type PostSummary } from '../../lib/api';
import { formatPrice, stripHtml } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

type FeedMode = 'recommend' | 'latest' | 'market';

type FeedItem =
  | { kind: 'post'; id: string; post: PostSummary }
  | { kind: 'market'; id: string; listing: MarketListingSummary };

type QuickActionKey = 'signin' | 'compose' | 'boards' | 'market' | 'rankings' | 'tasks';

const quickActions: { key: QuickActionKey; label: string }[] = [
  { key: 'signin', label: '签到' },
  { key: 'compose', label: '发布' },
  { key: 'boards', label: '图鉴' },
  { key: 'market', label: '交易' },
  { key: 'rankings', label: '排行榜' },
  { key: 'tasks', label: '任务' },
];
const modes: { key: FeedMode; label: string }[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'latest', label: '最新' },
  { key: 'market', label: '交易' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<FeedMode>('recommend');
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [marketItems, setMarketItems] = useState<MarketListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextMode = mode, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const postSort = nextMode === 'latest' ? 'latest' : 'recommend';
      const [postData, marketData] = await Promise.all([
        nextMode === 'market'
          ? Promise.resolve({ items: [] as PostSummary[] })
          : apiGet<{ items: PostSummary[] }>(`/api/posts?sort=${postSort}&limit=18`),
        apiGet<{ items: MarketListingSummary[] }>(
          `/api/market/listings?type=product&sort=latest&limit=${nextMode === 'market' ? 20 : 4}`,
        ),
      ]);
      setPosts(postData.items);
      setMarketItems(marketData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '首页加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useEffect(() => {
    void load(mode);
  }, [load, mode]);

  const feed = useMemo<FeedItem[]>(() => {
    if (mode === 'market') {
      return marketItems.map((listing) => ({ kind: 'market', id: `market-${listing.id}`, listing }));
    }
    const items: FeedItem[] = posts.map((post) => ({ kind: 'post', id: `post-${post.id}`, post }));
    marketItems.slice(0, 2).forEach((listing, index) => {
      items.splice(Math.min(2 + index * 4, items.length), 0, {
        kind: 'market',
        id: `market-${listing.id}`,
        listing,
      });
    });
    return items;
  }, [marketItems, mode, posts]);

  const onSelectMode = (nextMode: FeedMode) => {
    setMode(nextMode);
  };

  const onQuickAction = (key: QuickActionKey) => {
    if (key === 'compose') {
      router.push('/compose');
      return;
    }
    if (key === 'boards') {
      router.push('/(tabs)/boards');
      return;
    }
    if (key === 'market') {
      router.push('/(tabs)/market');
      return;
    }
    if (key === 'tasks') {
      router.push('/growth');
      return;
    }
    if (key === 'rankings') {
      router.push('/ranking');
      return;
    }
    router.push('/(tabs)/profile');
  };

  if (loading && feed.length === 0) return <LoadingView label="正在加载首页..." />;
  if (error && feed.length === 0) return <ErrorView message={error} onRetry={() => load(mode)} />;

  return (
    <FlatList
      data={feed}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(mode, true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListHeaderComponent={
        <HomeHeader
          activeMode={mode}
          onSelectMode={onSelectMode}
          onQuickAction={onQuickAction}
          onSearch={() => router.push('/search')}
          onNotifications={() => router.push('/notifications')}
          error={error}
        />
      }
      renderItem={({ item }) =>
        item.kind === 'post'
          ? <PostCard post={item.post} onPress={() => router.push(`/post/${item.post.id}`)} />
          : <MarketInlineCard listing={item.listing} onPress={() => router.push(`/market/${item.listing.id}`)} />
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function HomeHeader({
  activeMode,
  onSelectMode,
  onQuickAction,
  onSearch,
  onNotifications,
  error,
}: {
  activeMode: FeedMode;
  onSelectMode: (mode: FeedMode) => void;
  onQuickAction: (key: QuickActionKey) => void;
  onSearch: () => void;
  onNotifications: () => void;
  error: string | null;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>肉友社</Text>
          <Text style={styles.subtitle}>今天看看肉友们的新状态</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable style={styles.iconButton} onPress={onSearch}>
            <Text style={styles.iconText}>搜</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={onNotifications}>
            <Text style={styles.iconText}>信</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={quickActions}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.quickList}
        renderItem={({ item }) => (
          <Pressable style={styles.quickAction} onPress={() => onQuickAction(item.key)}>
            <Text style={styles.quickText}>{item.label}</Text>
          </Pressable>
        )}
      />

      <View style={styles.segmented}>
        {modes.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onSelectMode(item.key)}
            style={[styles.segment, activeMode === item.key && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeMode === item.key && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}
    </View>
  );
}

function PostCard({ post, onPress }: { post: PostSummary; onPress: () => void }) {
  const images = (post.images?.length ? post.images : post.cover ? [post.cover] : [])
    .map(absoluteAssetUrl)
    .filter((item): item is string => !!item)
    .slice(0, 4);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.authorRow}>
        <Avatar uri={post.author?.avatar} name={post.author?.name ?? '肉友'} />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{post.author?.name ?? '肉友'}</Text>
          <Text style={styles.cardMeta}>{post.board?.name ?? '社区'} · Lv.{post.author?.level ?? 1}</Text>
        </View>
      </View>

      <Text numberOfLines={2} style={styles.postTitle}>{post.title}</Text>
      {post.contentText ? <Text numberOfLines={3} style={styles.postText}>{post.contentText}</Text> : null}

      {images.length > 0 ? (
        <View style={images.length === 1 ? styles.singleImageWrap : styles.imageGrid}>
          {images.map((image, index) => (
            <Image
              key={`${image}-${index}`}
              source={{ uri: image }}
              style={images.length === 1 ? styles.singleImage : styles.gridImage}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.stats}>
        <Text style={styles.stat}>看 {post.views ?? 0}</Text>
        <Text style={styles.stat}>评 {post.comments ?? 0}</Text>
        <Text style={styles.stat}>赞 {post.likes ?? 0}</Text>
      </View>
    </Pressable>
  );
}

function MarketInlineCard({ listing, onPress }: { listing: MarketListingSummary; onPress: () => void }) {
  const product = listing.products?.[0];
  const image = absoluteAssetUrl(product?.cover || listing.cover);
  const desc = stripHtml(product?.description || listing.description);
  return (
    <Pressable style={[styles.card, styles.marketCard]} onPress={onPress}>
      <View style={styles.marketBadge}>
        <Text style={styles.marketBadgeText}>交易</Text>
      </View>
      <View style={styles.marketRow}>
        {image ? <Image source={{ uri: image }} style={styles.marketImage} /> : <View style={styles.marketFallback} />}
        <View style={styles.marketBody}>
          <Text numberOfLines={2} style={styles.marketTitle}>{listing.title}</Text>
          {desc ? <Text numberOfLines={2} style={styles.marketDesc}>{desc}</Text> : null}
          <View style={styles.marketBottom}>
            <Text style={styles.price}>{formatPrice(product?.price ?? listing.price)}</Text>
            <Text style={styles.cardMeta}>{listing.shipFrom ?? '发货地未填'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Avatar({ uri, name }: { uri?: string | null; name: string }) {
  const source = absoluteAssetUrl(uri);
  if (source) return <Image source={{ uri: source }} style={styles.avatar} />;
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
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
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  brand: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
  },
  topActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  quickList: {
    gap: spacing.sm,
  },
  quickAction: {
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
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
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.leaf,
  },
  inlineError: {
    color: '#b91c1c',
    fontSize: 12,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 15,
    fontWeight: '800',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  cardMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  postTitle: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  postText: {
    marginTop: spacing.xs,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  singleImageWrap: {
    marginTop: spacing.md,
    overflow: 'hidden',
    borderRadius: 14,
  },
  singleImage: {
    aspectRatio: 1.2,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.md,
  },
  gridImage: {
    aspectRatio: 1,
    width: '49%',
    borderRadius: 10,
    backgroundColor: colors.leafSoft,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  stat: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  marketCard: {
    backgroundColor: '#fffdfa',
  },
  marketBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  marketBadgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '900',
  },
  marketRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  marketImage: {
    height: 112,
    width: 112,
    borderRadius: 14,
    backgroundColor: colors.leafSoft,
  },
  marketFallback: {
    height: 112,
    width: 112,
    borderRadius: 14,
    backgroundColor: colors.leafSoft,
  },
  marketBody: {
    flex: 1,
    gap: spacing.xs,
  },
  marketTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  marketDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  marketBottom: {
    marginTop: 'auto',
    gap: 2,
  },
  price: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '900',
  },
});
