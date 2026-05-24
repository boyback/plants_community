import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  type UserConnectionResponse,
  type UserProfileSummary,
} from '../../lib/api';
import { colors, spacing } from '../../lib/theme';

type Kind = 'followers' | 'following';

export default function UserConnectionsScreen() {
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: Kind }>();
  const listKind: Kind = kind === 'following' ? 'following' : 'followers';
  const [items, setItems] = useState<UserProfileSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!id) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<UserConnectionResponse>(`/api/users/${id}/${listKind}`);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '列表加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, listKind]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView label="正在加载用户列表..." />;
  if (error && items.length === 0) return <ErrorView message={error} onRetry={() => load()} />;

  return (
    <>
      <Stack.Screen options={{ title: listKind === 'followers' ? '粉丝' : '关注' }} />
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
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{listKind === 'followers' ? '粉丝' : '关注'}</Text>
            <Text style={styles.meta}>共 {total} 人</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.meta}>暂无用户</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/user/${item.id}`)}>
            <Avatar user={item} />
            <View style={styles.body}>
              <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
              {item.bio ? <Text numberOfLines={2} style={styles.bio}>{item.bio}</Text> : null}
              <Text style={styles.meta}>
                Lv.{item.level} · 帖子 {item.posts} · 粉丝 {item.followers}
              </Text>
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </>
  );
}

function Avatar({ user }: { user: UserProfileSummary }) {
  const source = absoluteAssetUrl(user.avatar);
  if (source) return <Image source={{ uri: source }} style={styles.avatar} />;
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{user.name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: spacing.md,
  },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  avatar: {
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    width: 52,
    borderRadius: 26,
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 18,
    fontWeight: '900',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  bio: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
});
