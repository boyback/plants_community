import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, apiPost, clearMobileAuth, type AuthMe } from '../../lib/api';
import { colors, radii, shadows, spacing } from '../../lib/theme';

type ProfileMenuItem = {
  label: string;
  href?: '/my-posts' | '/orders' | '/collections' | '/notifications' | '/growth' | '/settings';
};

const menuItems: ProfileMenuItem[] = [
  { label: '我的帖子', href: '/my-posts' },
  { label: '我的交易', href: '/orders' },
  { label: '收藏', href: '/collections' },
  { label: '消息', href: '/notifications' },
  { label: '等级积分', href: '/growth' },
  { label: '设置', href: '/settings' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AuthMe>('/api/auth/me');
      setMe(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '用户信息加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const logout = async () => {
    await apiPost('/api/auth/logout').catch(() => null);
    await clearMobileAuth();
    setMe({ user: null });
  };

  const signIn = async () => {
    if (!user || signing || me?.signedInToday) return;
    setSigning(true);
    setError(null);
    try {
      const result = await apiPost<{ signInStreak: number; signedInToday: boolean }>(
        '/api/auth/signin',
      );
      setMe((prev) =>
        prev
          ? {
              ...prev,
              signInStreak: result.signInStreak,
              signedInToday: result.signedInToday,
            }
          : prev,
      );
      void load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '签到失败');
    } finally {
      setSigning(false);
    }
  };

  const openMenu = (item: ProfileMenuItem) => {
    setNotice(null);
    if (!user) {
      router.push('/login');
      return;
    }
    if (item.href) {
      router.push(item.href);
      return;
    }
    setNotice(`${item.label}正在接入中`);
  };

  if (loading) return <LoadingView label="正在加载我的信息..." />;
  if (error && !me) return <ErrorView message={error} onRetry={() => load()} />;

  const user = me?.user;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>PROFILE</Text>
        <Text style={styles.screenTitle}>我的</Text>
      </View>

      {user ? (
        <View style={styles.profileCard}>
          <View style={styles.userRow}>
            <Avatar uri={user.avatar} name={user.name} />
            <View style={styles.userInfo}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.meta}>
                Lv.{user.level} · {me?.vip?.isVip ? '会员' : '普通用户'}
              </Text>
            </View>
            <Pressable onPress={logout} style={styles.logoutButton}>
              <Text style={styles.logoutText}>退出</Text>
            </Pressable>
          </View>

          <View style={styles.stats}>
            <Stat label="帖子" value={user.posts ?? 0} />
            <Stat label="粉丝" value={user.followers ?? 0} />
            <Stat label="关注" value={user.following ?? 0} />
          </View>

          <View style={styles.pointsCard}>
            <View style={styles.pointsHeader}>
              <Text style={styles.pointsTitle}>积分与签到</Text>
              <Pressable
                disabled={signing || me?.signedInToday}
                onPress={signIn}
                style={[styles.signButton, me?.signedInToday && styles.signButtonDone]}
              >
                <Text style={[styles.signButtonText, me?.signedInToday && styles.signButtonDoneText]}>
                  {me?.signedInToday ? '已签' : signing ? '签到中' : '签到'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.pointsText}>
              {me?.signedInToday ? '今日已签到' : '今日未签到'} · 连续 {me?.signInStreak ?? 0} 天 · 积分{' '}
              {me?.pointsBalance ?? user.pointsBalance ?? 0}
            </Text>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          </View>
        </View>
      ) : (
        <View style={styles.loginCard}>
          <Text style={styles.title}>登录肉友社</Text>
          <Text style={styles.description}>登录后可以签到、发布、评论、收藏和管理交易。</Text>
          <Pressable style={styles.button} onPress={() => router.push('/login')}>
            <Text style={styles.buttonText}>登录</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.menu}>
        {menuItems.map((item) => (
          <Pressable key={item.label} style={styles.menuItem} onPress={() => openMenu(item)}>
            <Text style={styles.menuText}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: 64,
    paddingBottom: 118,
  },
  header: {
    gap: spacing.xs,
  },
  kicker: {
    color: colors.leafDeep,
    fontSize: 12,
    fontWeight: '800',
  },
  screenTitle: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 38,
  },
  profileCard: {
    ...shadows.card,
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    height: 58,
    width: 58,
    borderRadius: 29,
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
    width: 58,
    borderRadius: 29,
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 20,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
  },
  logoutButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  logoutText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  pointsCard: {
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.leafSoft,
    padding: spacing.md,
  },
  pointsTitle: {
    color: colors.leaf,
    fontSize: 14,
    fontWeight: '900',
  },
  pointsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pointsText: {
    color: colors.muted,
    fontSize: 13,
  },
  signButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  signButtonDone: {
    backgroundColor: colors.surface,
  },
  signButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  signButtonDoneText: {
    color: colors.muted,
  },
  inlineError: {
    color: '#b91c1c',
    fontSize: 12,
  },
  notice: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  loginCard: {
    ...shadows.card,
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  menu: {
    ...shadows.card,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.md,
  },
  menuText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  chevron: {
    color: colors.muted,
    fontSize: 24,
  },
});
