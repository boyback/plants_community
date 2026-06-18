import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import { absoluteAssetUrl, apiGet, type RankingKind, type RankingResponse } from '../lib/api';
import { colors, spacing } from '../lib/theme';

const tabs: { key: RankingKind; label: string }[] = [
  { key: 'points', label: '钻石' },
  { key: 'posts', label: '发帖' },
  { key: 'comments', label: '评论' },
  { key: 'level', label: '等级' },
  { key: 'followers', label: '粉丝' },
];

export default function RankingScreen() {
  const router = useRouter();
  const [kind, setKind] = useState<RankingKind>('points');
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextKind = kind, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await apiGet<RankingResponse>(`/api/mobile/ranking?kind=${nextKind}&limit=50`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '排行榜加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [kind]);

  useEffect(() => {
    void load(kind);
  }, [kind, load]);

  const switchKind = (nextKind: RankingKind) => {
    setKind(nextKind);
    setNotice(null);
  };

  if (loading && !data) return <LoadingView label="正在加载排行榜..." />;
  if (error && !data) return <ErrorView message={error} onRetry={() => load(kind)} />;

  const top = data?.items.slice(0, 3) ?? [];
  const rest = data?.items.slice(3) ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(kind, true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>排行榜</Text>
        <Text style={styles.subtitle}>钻石、发帖、评论、等级和粉丝榜单</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((item) => {
          const active = kind === item.key;
          return (
            <Pressable key={item.key} onPress={() => switchKind(item.key)} style={[styles.tab, active && styles.tabActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {data ? (
        <View style={styles.poster}>
          <View style={styles.posterHeader}>
            <View>
              <Text style={styles.posterEyebrow}>Community Ranking</Text>
              <Text style={styles.posterTitle}>{data.title}</Text>
              <Text style={styles.posterDesc}>{data.desc}</Text>
            </View>
            <Text style={styles.month}>{data.yearMonth}</Text>
          </View>

          <View style={styles.podium}>
            <Podium row={top.find((item) => item.rank === 2)} place={2} unit={data.unit} />
            <Podium row={top.find((item) => item.rank === 1)} place={1} unit={data.unit} primary />
            <Podium row={top.find((item) => item.rank === 3)} place={3} unit={data.unit} />
          </View>
        </View>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      <View style={styles.list}>
        {rest.length > 0 ? (
          rest.map((row) => (
            <Pressable key={row.user.id} style={styles.row} onPress={() => router.push(`/user/${row.user.id}`)}>
              <Text style={styles.rank}>{row.rank}</Text>
              <Avatar uri={row.user.avatar} name={row.user.name} size={36} />
              <View style={styles.userInfo}>
                <Text numberOfLines={1} style={styles.userName}>{row.user.name}</Text>
                <Text style={styles.meta}>Lv.{row.user.level} · 帖子 {row.user.posts} · 粉丝 {row.user.followers}</Text>
              </View>
              <Text style={styles.score}>{row.score} {data?.unit}</Text>
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.meta}>暂无更多上榜用户</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function Podium({
  row,
  place,
  unit,
  primary,
}: {
  row?: RankingResponse['items'][number];
  place: 1 | 2 | 3;
  unit: string;
  primary?: boolean;
}) {
  const height = primary ? 140 : place === 2 ? 110 : 96;
  const tone = place === 1 ? '#fef3c7' : place === 2 ? '#eef2f7' : colors.leafSoft;
  if (!row) {
    return (
      <View style={styles.podiumItem}>
        <View style={[styles.podiumBlock, { height, backgroundColor: tone }]}>
          <Text style={styles.emptyPlace}>未上榜</Text>
        </View>
      </View>
    );
  }
  return (
    <Pressable style={styles.podiumItem}>
      <View style={styles.placeBadge}>
        <Text style={styles.placeText}>{place}</Text>
      </View>
      <Avatar uri={row.user.avatar} name={row.user.name} size={primary ? 64 : 54} />
      <Text numberOfLines={1} style={styles.podiumName}>{row.user.name}</Text>
      <Text style={styles.podiumScore}>{row.score} {unit}</Text>
      <View style={[styles.podiumBlock, { height, backgroundColor: tone }]}>
        <Text style={[styles.podiumNumber, primary && styles.podiumNumberPrimary]}>{place}</Text>
      </View>
    </Pressable>
  );
}

function Avatar({ uri, name, size }: { uri?: string | null; name: string; size: number }) {
  const source = absoluteAssetUrl(uri);
  if (source) {
    return <Image source={{ uri: source }} style={[styles.avatar, { height: size, width: size, borderRadius: size / 2 }]} />;
  }
  return (
    <View style={[styles.avatarFallback, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  tabs: {
    gap: spacing.sm,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  tabText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  tabTextActive: {
    color: colors.leaf,
  },
  poster: {
    overflow: 'hidden',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  posterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  posterEyebrow: {
    color: colors.leaf,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  posterTitle: {
    marginTop: 2,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  posterDesc: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
  },
  month: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minHeight: 245,
  },
  podiumItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
  },
  placeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  avatar: {
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 16,
    fontWeight: '900',
  },
  podiumName: {
    maxWidth: '100%',
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  podiumScore: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  podiumBlock: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingBottom: spacing.md,
  },
  podiumNumber: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: '900',
  },
  podiumNumberPrimary: {
    fontSize: 40,
  },
  emptyPlace: {
    color: colors.muted,
    fontSize: 12,
  },
  notice: {
    color: colors.muted,
    fontSize: 13,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  rank: {
    width: 28,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  score: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
