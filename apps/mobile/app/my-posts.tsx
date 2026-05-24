import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import { absoluteAssetUrl, apiGet, type AuthMe, type PostSummary } from '../lib/api';
import { colors, spacing } from '../lib/theme';

export default function MyPostsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const me = await apiGet<AuthMe>('/api/auth/me');
      if (!me.user) {
        router.replace('/login');
        return;
      }
      const data = await apiGet<{ items: PostSummary[] }>(
        `/api/posts?author=${me.user.id}&sort=latest&limit=50`,
      );
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '我的帖子加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView label="正在加载我的帖子..." />;
  if (error && items.length === 0) return <ErrorView message={error} onRetry={() => load()} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>还没有发布内容</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/compose')}>
            <Text style={styles.primaryButtonText}>去发布</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function PostCard({ post, onPress }: { post: PostSummary; onPress: () => void }) {
  const image = absoluteAssetUrl(post.cover || post.images?.[0]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.title}>{post.title}</Text>
        {post.contentText ? <Text numberOfLines={2} style={styles.desc}>{post.contentText}</Text> : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{post.board?.name ?? '社区'}</Text>
          <Text style={styles.meta}>看 {post.views ?? 0} · 评 {post.comments ?? 0} · 赞 {post.likes ?? 0}</Text>
        </View>
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
  metaRow: {
    marginTop: 'auto',
    gap: 2,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.muted,
    fontSize: 14,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
