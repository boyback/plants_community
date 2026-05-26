import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  apiPost,
  ApiError,
  type PostSummary,
  type UserProfileResponse,
} from '../../lib/api';
import { colors, radii, shadows, spacing } from '../../lib/theme';

export default function UserProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!id) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<UserProfileResponse>(`/api/mobile/users/${id}`);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '用户主页加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = async () => {
    if (!id || !profile || profile.isMe || followBusy) return;
    setFollowBusy(true);
    setNotice(null);
    try {
      const result = await apiPost<{ followed: boolean; followers: number }>(`/api/users/${id}/follow`);
      setProfile((current) =>
        current
          ? {
              ...current,
              followed: result.followed,
              user: { ...current.user, followers: result.followers },
            }
          : current,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push('/login');
      } else {
        setNotice(err instanceof Error ? err.message : '操作失败');
      }
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return <LoadingView label="正在加载用户主页..." />;
  if (!profile) return <ErrorView message={error ?? '用户不存在'} onRetry={() => load()} />;

  return (
    <>
      <Stack.Screen options={{ title: profile.user.name, headerStyle: { backgroundColor: colors.background } }} />
      <FlatList
        data={profile.posts}
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
          <Header
            profile={profile}
            notice={notice}
            followBusy={followBusy}
            onToggleFollow={toggleFollow}
            onOpenConnections={(kind) => router.push(`/user-connections/${profile.user.id}?kind=${kind}`)}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.meta}>还没有发布内容</Text>
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </>
  );
}

function Header({
  profile,
  notice,
  followBusy,
  onToggleFollow,
  onOpenConnections,
}: {
  profile: UserProfileResponse;
  notice: string | null;
  followBusy: boolean;
  onToggleFollow: () => void;
  onOpenConnections: (kind: 'followers' | 'following') => void;
}) {
  const avatar = absoluteAssetUrl(profile.user.avatar);
  const obtainedBadges = profile.user.badges?.filter((badge) => badge.obtained).slice(0, 8) ?? [];
  return (
    <View style={styles.header}>
      <View style={styles.cover} />
      <View style={styles.profileCard}>
        <View style={styles.topRow}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{profile.user.name.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.name}>{profile.user.name}</Text>
              {profile.vip.isVip ? <Text style={styles.vip}>VIP</Text> : null}
            </View>
            <Text style={styles.meta}>Lv.{profile.user.level} · 经验 {profile.exp}</Text>
          </View>
          {!profile.isMe ? (
            <Pressable
              disabled={followBusy}
              onPress={onToggleFollow}
              style={[styles.followButton, profile.followed && styles.followButtonDone]}
            >
              <Text style={[styles.followText, profile.followed && styles.followTextDone]}>
                {followBusy ? '...' : profile.followed ? '已关注' : '关注'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {profile.user.bio ? <Text style={styles.bio}>{profile.user.bio}</Text> : null}

        <View style={styles.stats}>
          <Stat label="帖子" value={profile.user.posts} />
          <Stat label="粉丝" value={profile.user.followers} onPress={() => onOpenConnections('followers')} />
          <Stat label="关注" value={profile.user.following} onPress={() => onOpenConnections('following')} />
        </View>

        {obtainedBadges.length > 0 ? (
          <View style={styles.badges}>
            {obtainedBadges.map((badge) => (
              <View key={badge.id} style={styles.badge}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      <Text style={styles.sectionTitle}>发布的帖子</Text>
    </View>
  );
}

function Stat({ label, value, onPress }: { label: string; value: number; onPress?: () => void }) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function PostCard({ post, onPress }: { post: PostSummary; onPress: () => void }) {
  const image = absoluteAssetUrl(post.cover || post.images?.[0]);
  return (
    <Pressable style={styles.postCard} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.postCover} /> : <View style={styles.postCoverFallback} />}
      <View style={styles.postBody}>
        <Text numberOfLines={2} style={styles.postTitle}>{post.title}</Text>
        {post.contentText ? <Text numberOfLines={2} style={styles.postDesc}>{post.contentText}</Text> : null}
        <Text style={styles.meta}>看 {post.views ?? 0} · 评 {post.comments ?? 0} · 赞 {post.likes ?? 0}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: 118,
  },
  separator: {
    height: spacing.md,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cover: {
    height: 110,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundSoft,
  },
  profileCard: {
    ...shadows.card,
    gap: spacing.md,
    marginTop: -42,
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    height: 70,
    width: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    width: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 24,
    fontWeight: '900',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
  },
  vip: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.leafSoft,
    color: colors.leafDeep,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  followButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  followButtonDone: {
    backgroundColor: colors.leafSoft,
  },
  followText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  followTextDone: {
    color: colors.leaf,
  },
  bio: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 38,
    width: 38,
    borderRadius: radii.sm,
    backgroundColor: colors.leafSoft,
  },
  badgeIcon: {
    fontSize: 20,
  },
  notice: {
    color: colors.muted,
    fontSize: 13,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  postCard: {
    ...shadows.card,
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  postCover: {
    aspectRatio: 1.35,
    width: '100%',
    backgroundColor: colors.backgroundSoft,
  },
  postCoverFallback: {
    aspectRatio: 1.35,
    width: '100%',
    backgroundColor: colors.backgroundSoft,
  },
  postBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  postTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  postDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    ...shadows.card,
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
