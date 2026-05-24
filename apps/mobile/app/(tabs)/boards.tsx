import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, type BoardSummary } from '../../lib/api';
import { colors, spacing } from '../../lib/theme';

export default function BoardsScreen() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<BoardSummary[]>('/api/boards?kind=family');
      setBoards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图鉴加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingView label="正在加载图鉴..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>图鉴</Text>
        <Text style={styles.description}>按科属品种浏览多肉内容，后续接入关注和品种详情。</Text>
      </View>

      <View style={styles.list}>
        {boards.map((board) => {
          const cover = absoluteAssetUrl(board.cover);
          const textIcon = board.icon && !board.icon.startsWith('http') ? board.icon : '';
          return (
            <Pressable key={board.id} style={styles.card} onPress={() => router.push(`/board/${board.slug}`)}>
              {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.cardTitle}>
                    {textIcon ? `${textIcon} ` : ''}
                    {board.name}
                  </Text>
                  <Text style={styles.count}>{board.childrenCount ?? 0} 属</Text>
                </View>
                {board.latinName ? <Text numberOfLines={1} style={styles.latin}>{board.latinName}</Text> : null}
                <Text numberOfLines={2} style={styles.cardDesc}>
                  {board.description || '暂无简介'}
                </Text>
                <Text style={styles.meta}>{board.posts ?? 0} 个帖子</Text>
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
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    height: 104,
    width: 104,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    height: 104,
    width: 104,
    backgroundColor: colors.leafSoft,
  },
  cardBody: {
    flex: 1,
    gap: 4,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  count: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '700',
  },
  latin: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '700',
  },
});
