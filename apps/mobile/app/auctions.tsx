import { useCallback, useEffect, useState } from 'react';
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

import { ErrorView, LoadingView } from '../components/StateView';
import { absoluteAssetUrl, apiGet, type AuctionSummary } from '../lib/api';
import { formatPrice, stripHtml } from '../lib/format';
import { colors, spacing } from '../lib/theme';

type AuctionTab = 'live' | 'scheduled' | 'finished';

const tabs: { key: AuctionTab; label: string }[] = [
  { key: 'live', label: '进行中' },
  { key: 'scheduled', label: '预展' },
  { key: 'finished', label: '已结束' },
];

export default function AuctionsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<AuctionTab>('live');
  const [items, setItems] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextTab = tab, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ items: AuctionSummary[]; nextCursor?: string | null }>(
        `/api/auctions?status=${nextTab}&limit=30`,
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '拍卖加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  if (loading && items.length === 0) return <LoadingView label="正在加载拍卖..." />;
  if (error && items.length === 0) return <ErrorView message={error} onRetry={() => load(tab)} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(tab, true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>拍卖</Text>
          <Text style={styles.desc}>保证金参与，出价成功后按规则生成尾款订单。</Text>
          <View style={styles.segmented}>
            {tabs.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={[styles.segment, tab === item.key && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, tab === item.key && styles.segmentTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无拍卖</Text>
        </View>
      }
      renderItem={({ item }) => (
        <AuctionCard auction={item} onPress={() => router.push(`/auction/${item.id}`)} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function AuctionCard({ auction, onPress }: { auction: AuctionSummary; onPress: () => void }) {
  const cover = absoluteAssetUrl(auction.cover);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.status}>{auctionStatusLabel(auction.status)}</Text>
          <Text style={styles.time}>{formatRemain(auction.endAt, auction.status)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.cardTitle}>{auction.title}</Text>
        {auction.descriptionText || auction.description ? (
          <Text numberOfLines={2} style={styles.descText}>
            {auction.descriptionText || stripHtml(auction.description)}
          </Text>
        ) : null}
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(auction.currentPrice)}</Text>
          <Text style={styles.meta}>{auction.bidCount} 次出价</Text>
        </View>
        <Text style={styles.meta}>保证金 {formatPrice(auction.depositAmount)} · {auction.seller.name}</Text>
      </View>
    </Pressable>
  );
}

function auctionStatusLabel(status: AuctionSummary['status']) {
  if (status === 'live') return '进行中';
  if (status === 'scheduled') return '预展';
  if (status === 'finished') return '已结束';
  if (status === 'cancelled') return '已取消';
  return '草稿';
}

function formatRemain(endAt: string, status: AuctionSummary['status']) {
  if (status !== 'live') return new Date(endAt).toLocaleDateString();
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return '即将结束';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}小时${minutes}分` : `${minutes}分`;
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
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  desc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
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
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.leaf,
  },
  card: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    aspectRatio: 1.45,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    aspectRatio: 1.45,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  cardBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  time: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  descText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  price: {
    color: '#dc2626',
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
