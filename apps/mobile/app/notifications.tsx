import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  apiPost,
  type NotificationSummary,
  type NotificationsResponse,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type TabKey = 'all' | NotificationSummary['type'];

const tabs: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'like', label: '赞' },
  { key: 'comment', label: '评论' },
  { key: 'follow', label: '关注' },
  { key: 'mention', label: '@我' },
  { key: 'system', label: '系统' },
];

export default function NotificationsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('all');
  const [items, setItems] = useState<NotificationSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<NotificationsResponse>('/api/notifications');
      setItems(data.items);
      setUnread(data.unread);
    } catch (err) {
      setError(err instanceof Error ? err.message : '消息加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => items.filter((item) => tab === 'all' || item.type === tab),
    [items, tab],
  );

  const markAllRead = async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnread(0);
    await apiPost<{ unread: number }>('/api/notifications/read', { all: true }).catch(() => null);
  };

  const openNotification = async (item: NotificationSummary) => {
    if (!item.read) {
      setItems((current) =>
        current.map((next) => (next.id === item.id ? { ...next, read: true } : next)),
      );
      setUnread((current) => Math.max(0, current - 1));
      await apiPost('/api/notifications/read', { ids: [item.id] }).catch(() => null);
    }

    const target = toAppRoute(item.link);
    if (target) router.push(target);
  };

  if (loading) return <LoadingView label="正在加载消息..." />;
  if (error && items.length === 0) return <ErrorView message={error} onRetry={() => load()} />;

  return (
    <FlatList
      data={filtered}
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
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.title}>消息</Text>
              <Text style={styles.subtitle}>{unread > 0 ? `${unread} 条未读` : '全部已读'}</Text>
            </View>
            <Pressable onPress={markAllRead} disabled={unread === 0} style={[styles.readAll, unread === 0 && styles.disabled]}>
              <Text style={styles.readAllText}>全部已读</Text>
            </Pressable>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={tabs}
            keyExtractor={(item) => item.key}
            contentContainerStyle={styles.tabs}
            renderItem={({ item }) => {
              const active = tab === item.key;
              const count = items.filter((n) => !n.read && (item.key === 'all' || n.type === item.key)).length;
              return (
                <Pressable onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {item.label}{count > 0 ? ` ${count}` : ''}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无消息</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => openNotification(item)} style={[styles.card, !item.read && styles.unreadCard]}>
          <Avatar item={item} />
          <View style={styles.cardBody}>
            <Text style={styles.message}>
              {item.fromUser ? `${item.fromUser.name} ` : ''}
              {item.text}
            </Text>
            <Text style={styles.meta}>
              {typeLabel(item.type)} · {formatTime(item.createdAt)}
            </Text>
          </View>
          {!item.read ? <View style={styles.dot} /> : null}
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function Avatar({ item }: { item: NotificationSummary }) {
  const source = absoluteAssetUrl(item.fromUser?.avatar);
  if (source) return <Image source={{ uri: source }} style={styles.avatar} />;
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{typeIcon(item.type)}</Text>
    </View>
  );
}

function toAppRoute(link?: string): string | null {
  if (!link) return null;
  const raw = link.replace(/^https?:\/\/[^/]+/, '').split('#')[0];
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  if (/^\/post\/[^/]+$/.test(path)) return path;
  if (/^\/market\/[^/]+$/.test(path)) return path;
  if (/^\/auction\/[^/]+$/.test(path)) return path;
  if (/^\/user\/[^/]+$/.test(path)) return path;
  if (/^\/board\/.+/.test(path)) return path;
  if (/^\/checkout\/[^/]+$/.test(path)) return `/order/${path.split('/')[2]}`;
  if (/^\/checkout\/auction\/[^/]+$/.test(path)) return `/order/${path.split('/')[3]}`;
  if (/^\/orders/.test(path)) {
    const orderId = params.get('id') || params.get('orderId');
    return orderId ? `/order/${orderId}` : '/orders';
  }
  if (/^\/settings/.test(path)) return '/settings';
  if (/^\/addresses/.test(path)) return '/addresses';
  if (/^\/notifications/.test(path)) return '/notifications';
  if (/^\/ranking/.test(path)) return '/ranking';
  if (/^\/search/.test(path)) return '/search';
  if (/^\/topic\/[^/]+$/.test(path)) {
    const q = decodeURIComponent(path.split('/')[2] || '');
    return q ? `/search?q=${encodeURIComponent(q)}` : '/search';
  }
  return null;
}

function typeIcon(type: NotificationSummary['type']) {
  if (type === 'like') return '赞';
  if (type === 'comment') return '评';
  if (type === 'follow') return '关';
  if (type === 'mention') return '@';
  return '系';
}

function typeLabel(type: NotificationSummary['type']) {
  if (type === 'like') return '点赞';
  if (type === 'comment') return '评论';
  if (type === 'follow') return '关注';
  if (type === 'mention') return '提到你';
  return '系统';
}

function formatTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return date.toLocaleDateString();
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 13,
  },
  readAll: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  readAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  tabs: {
    gap: spacing.sm,
  },
  tab: {
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  separator: {
    height: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  unreadCard: {
    borderColor: '#b7d9ad',
    backgroundColor: '#f3fbf0',
  },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  dot: {
    marginTop: 8,
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
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
