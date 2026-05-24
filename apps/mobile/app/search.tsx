import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  absoluteAssetUrl,
  apiGet,
  type HotSearchResponse,
  type SearchResponse,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type Kind = 'all' | 'posts' | 'species' | 'boards' | 'users';
type ResultItem =
  | { kind: 'post'; id: string; title: string; desc: string; cover?: string | null; meta: string; target: string }
  | { kind: 'species'; id: string; title: string; desc: string; cover?: string | null; meta: string; target: string | null }
  | { kind: 'board'; id: string; title: string; desc: string; cover?: string | null; meta: string; target: string | null }
  | { kind: 'user'; id: string; title: string; desc: string; cover?: string | null; meta: string; target: string | null };

const kinds: { key: Kind; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'posts', label: '帖子' },
  { key: 'species', label: '图鉴' },
  { key: 'boards', label: '板块' },
  { key: 'users', label: '肉友' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [hot, setHot] = useState<HotSearchResponse['hot']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    apiGet<HotSearchResponse>('/api/search/hot?shuffle=1')
      .then((res) => setHot(res.hot.slice(0, 12)))
      .catch(() => null);
  }, []);

  const search = useCallback(async (nextQuery = query, nextKind = kind) => {
    const q = nextQuery.trim();
    setSubmitted(q);
    setNotice(null);
    if (!q) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<SearchResponse>(
        `/api/search?q=${encodeURIComponent(q)}&kind=${nextKind}`,
      );
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setLoading(false);
    }
  }, [kind, query]);

  const switchKind = (nextKind: Kind) => {
    setKind(nextKind);
    if (submitted) void search(submitted, nextKind);
  };

  const items = useMemo<ResultItem[]>(() => {
    if (!data) return [];
    const result: ResultItem[] = [];
    if (kind === 'all' || kind === 'posts') {
      result.push(
        ...data.posts.map((post) => ({
          kind: 'post' as const,
          id: post.id,
          title: post.title,
          desc: post.excerpt,
          cover: post.cover,
          meta: `${post.author.name} · 看 ${post.views} · 评 ${post.comments} · 赞 ${post.likes}`,
          target: `/post/${post.id}`,
        })),
      );
    }
    if (kind === 'all' || kind === 'species') {
      result.push(
        ...data.species.map((item) => ({
          kind: 'species' as const,
          id: item.id,
          title: item.name,
          desc: item.latinName ?? '',
          cover: item.cover,
          meta: '图鉴',
          target: item.url,
        })),
      );
    }
    if (kind === 'all' || kind === 'boards') {
      result.push(
        ...data.boards.map((board) => ({
          kind: 'board' as const,
          id: board.id,
          title: board.name,
          desc: board.description ?? '',
          cover: board.cover,
          meta: '板块',
          target: `/board/${board.slug}`,
        })),
      );
    }
    if (kind === 'all' || kind === 'users') {
      result.push(
        ...data.users.map((user) => ({
          kind: 'user' as const,
          id: user.id,
          title: user.name,
          desc: user.bio || (user.handle ? `@${user.handle}` : ''),
          cover: user.avatar,
          meta: `Lv.${user.level} · 帖子 ${user.posts} · 粉丝 ${user.followers}`,
          target: null,
        })),
      );
    }
    return result;
  }, [data, kind]);

  const openResult = (item: ResultItem) => {
    setNotice(null);
    if (item.target) {
      router.push(item.target);
      return;
    }
    if (item.kind === 'user') {
      router.push(`/user/${item.id}`);
    }
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="搜索帖子、图鉴、板块、肉友"
              placeholderTextColor={colors.muted}
              autoFocus
              returnKeyType="search"
              onSubmitEditing={() => search()}
              style={styles.input}
            />
            <Pressable onPress={() => search()} disabled={loading} style={styles.searchButton}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>搜索</Text>}
            </Pressable>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={kinds}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.tabs}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => switchKind(item.key)}
                style={[styles.tab, kind === item.key && styles.tabActive]}
              >
                <Text style={[styles.tabText, kind === item.key && styles.tabTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
          />

          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!submitted ? (
            <View style={styles.hotSection}>
              <Text style={styles.sectionTitle}>热门搜索</Text>
              <View style={styles.hotWrap}>
                {hot.map((item, index) => (
                  <Pressable
                    key={`${item.q}-${index}`}
                    onPress={() => {
                      setQuery(item.q);
                      void search(item.q, 'all');
                    }}
                    style={styles.hotChip}
                  >
                    <Text style={styles.hotText}>
                      {item.q}{item.count ? ` ${item.count}` : ''}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.summary}>
              {loading ? '搜索中...' : `“${submitted}” 找到 ${items.length} 条结果`}
            </Text>
          )}
        </View>
      }
      ListEmptyComponent={
        submitted && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>没有找到相关内容</Text>
          </View>
        ) : null
      }
      renderItem={({ item }) => <ResultCard item={item} onPress={() => openResult(item)} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function ResultCard({ item, onPress }: { item: ResultItem; onPress: () => void }) {
  const image = absoluteAssetUrl(item.cover);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
        {item.desc ? <Text numberOfLines={2} style={styles.desc}>{item.desc}</Text> : null}
        <Text numberOfLines={1} style={styles.meta}>{item.meta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  searchButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 68,
    borderRadius: 16,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
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
  hotSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  hotWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  hotChip: {
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hotText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  summary: {
    color: colors.muted,
    fontSize: 13,
  },
  notice: {
    color: colors.muted,
    fontSize: 13,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
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
    height: 108,
    width: 108,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    height: 108,
    width: 108,
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
  meta: {
    marginTop: 'auto',
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
