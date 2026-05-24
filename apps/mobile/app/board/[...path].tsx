import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, type BoardDetailResponse, type PostSummary } from '../../lib/api';
import { colors, spacing } from '../../lib/theme';

type Item =
  | { kind: 'child'; id: string; title: string; desc?: string | null; cover?: string | null; meta: string; path: string }
  | { kind: 'post'; id: string; post: PostSummary };

export default function BoardDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ path?: string[] | string }>();
  const pathParts = useMemo(() => {
    if (Array.isArray(params.path)) return params.path;
    if (typeof params.path === 'string') return [params.path];
    return [];
  }, [params.path]);
  const apiPath = pathParts.map(encodeURIComponent).join('/');
  const [data, setData] = useState<BoardDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!apiPath) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const result = await apiGet<BoardDetailResponse>(`/api/mobile/boards/${apiPath}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图鉴详情加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo<Item[]>(() => {
    if (!data) return [];
    const childItems = (data.type === 'species' ? data.related : data.children).map((item) => ({
      kind: 'child' as const,
      id: item.id,
      title: item.name,
      desc: item.latinName,
      cover: item.cover,
      meta:
        data.type === 'category'
          ? `${'speciesCount' in item ? item.speciesCount ?? 0 : 0} 个品种 · ${item.posts ?? 0} 帖`
          : `${item.posts ?? 0} 帖`,
      path: item.path,
    }));
    return [
      ...childItems,
      ...data.posts.map((post) => ({ kind: 'post' as const, id: post.id, post })),
    ];
  }, [data]);

  if (loading) return <LoadingView label="正在加载图鉴..." />;
  if (!data) return <ErrorView message={error ?? '图鉴不存在'} onRetry={() => load()} />;

  return (
    <>
      <Stack.Screen options={{ title: data.detail.name }} />
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
        ListHeaderComponent={<Header data={data} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.meta}>暂无内容</Text>
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'child' ? (
            <ChildCard item={item} onPress={() => router.push(item.path)} />
          ) : (
            <PostCard post={item.post} onPress={() => router.push(`/post/${item.post.id}`)} />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </>
  );
}

function Header({ data }: { data: BoardDetailResponse }) {
  const cover = absoluteAssetUrl(data.detail.cover || data.detail.gallery?.[0]);
  return (
    <View style={styles.header}>
      {cover ? <Image source={{ uri: cover }} style={styles.heroImage} /> : <View style={styles.heroFallback} />}
      <View style={styles.headerCard}>
        <Text style={styles.crumbs}>{data.path.map((item) => item.label).join(' / ')}</Text>
        <Text style={styles.title}>{data.detail.name}</Text>
        {data.detail.latinName ? <Text style={styles.latin}>{data.detail.latinName}</Text> : null}
        {data.detail.description ? <Text style={styles.desc}>{data.detail.description}</Text> : null}

        {data.type === 'species' ? <SpeciesFacts data={data} /> : <GroupFacts data={data} />}

        {data.detail.tips?.length ? (
          <View style={styles.tips}>
            {data.detail.tips.slice(0, 5).map((tip) => (
              <Text key={tip} style={styles.tip}>{tip}</Text>
            ))}
          </View>
        ) : null}
      </View>

      {(data.type === 'species' ? data.related.length : data.children.length) > 0 ? (
        <Text style={styles.sectionTitle}>{data.type === 'species' ? '同属品种' : '下级图鉴'}</Text>
      ) : null}
      {data.posts.length > 0 ? <Text style={styles.sectionTitle}>相关帖子</Text> : null}
    </View>
  );
}

function SpeciesFacts({ data }: { data: BoardDetailResponse }) {
  return (
    <View style={styles.facts}>
      <Fact label="难度" value={`${data.detail.avgDifficulty?.toFixed(1) ?? data.detail.difficulty ?? '-'} / 5`} />
      <Fact label="光照" value={data.detail.light ?? '-'} />
      <Fact label="浇水" value={data.detail.watering ?? '-'} />
      <Fact label="耐寒" value={data.detail.hardiness ?? '-'} />
      {data.detail.growthType ? <Fact label="生长型" value={data.detail.growthType} /> : null}
      {data.detail.originRegion ? <Fact label="原产地" value={data.detail.originRegion} /> : null}
    </View>
  );
}

function GroupFacts({ data }: { data: BoardDetailResponse }) {
  return (
    <View style={styles.facts}>
      <Fact label="帖子" value={String(data.detail.posts ?? 0)} />
      {data.type === 'category' ? <Fact label="属" value={String(data.detail.generaCount ?? 0)} /> : null}
      {data.type === 'genus' ? <Fact label="品种" value={String(data.detail.speciesCount ?? 0)} /> : null}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factValue}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

function ChildCard({
  item,
  onPress,
}: {
  item: Extract<Item, { kind: 'child' }>;
  onPress: () => void;
}) {
  const image = absoluteAssetUrl(item.cover);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
        {item.desc ? <Text numberOfLines={1} style={styles.cardDesc}>{item.desc}</Text> : null}
        <Text style={styles.meta}>{item.meta}</Text>
      </View>
    </Pressable>
  );
}

function PostCard({ post, onPress }: { post: PostSummary; onPress: () => void }) {
  const image = absoluteAssetUrl(post.cover || post.images?.[0]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.cardTitle}>{post.title}</Text>
        {post.contentText ? <Text numberOfLines={2} style={styles.cardDesc}>{post.contentText}</Text> : null}
        <Text style={styles.meta}>看 {post.views ?? 0} · 评 {post.comments ?? 0} · 赞 {post.likes ?? 0}</Text>
      </View>
    </Pressable>
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
  heroImage: {
    height: 220,
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.leafSoft,
  },
  heroFallback: {
    height: 220,
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.leafSoft,
  },
  headerCard: {
    gap: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  crumbs: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  latin: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  desc: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fact: {
    minWidth: '30%',
    flexGrow: 1,
    borderRadius: 14,
    backgroundColor: colors.leafSoft,
    padding: spacing.sm,
  },
  factValue: {
    color: colors.leaf,
    fontSize: 14,
    fontWeight: '900',
  },
  factLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  tips: {
    gap: spacing.xs,
  },
  tip: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
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
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    marginTop: 'auto',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
