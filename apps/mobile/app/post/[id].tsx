import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { ImagePreview } from '../../components/ImagePreview';
import {
  absoluteAssetUrl,
  apiGet,
  apiPost,
  ApiError,
  type AuthMe,
  type CommentSummary,
  type PostDetail,
} from '../../lib/api';
import { stripHtml } from '../../lib/format';
import { colors, radii, shadows, spacing } from '../../lib/theme';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [me, setMe] = useState<AuthMe['user'] | null>(null);
  const [comments, setComments] = useState<CommentSummary[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [collected, setCollected] = useState(false);
  const [likes, setLikes] = useState(0);
  const [collects, setCollects] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [acting, setActing] = useState<'like' | 'collect' | 'delete' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PostDetail>(`/api/posts/${id}`);
      setPost(data);
      setComments(data.commentList ?? []);
      setLikes(data.likes ?? 0);

      const [authState, likeState, collectState] = await Promise.all([
        apiGet<AuthMe>('/api/auth/me').catch(() => null),
        apiGet<{ liked: boolean; total: number }>(`/api/posts/${id}/like`).catch(() => null),
        apiGet<{ collected: boolean; total: number }>(`/api/posts/${id}/collect`).catch(() => null),
      ]);
      setMe(authState?.user ?? null);
      if (likeState) {
        setLiked(likeState.liked);
        setLikes(likeState.total);
      }
      if (collectState) {
        setCollected(collectState.collected);
        setCollects(collectState.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '帖子加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const images = useMemo(
    () =>
      (post?.images?.length ? post.images : post?.cover ? [post.cover] : [])
        .map(absoluteAssetUrl)
        .filter((item): item is string => !!item),
    [post],
  );

  const requireLogin = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const toggleLike = async () => {
    if (!id || acting) return;
    setActing('like');
    setError(null);
    try {
      const result = await apiPost<{ liked: boolean; total: number }>(`/api/posts/${id}/like`);
      setLiked(result.liked);
      setLikes(result.total);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActing(null);
    }
  };

  const toggleCollect = async () => {
    if (!id || acting) return;
    setActing('collect');
    setError(null);
    try {
      const result = await apiPost<{ collected: boolean; total: number }>(
        `/api/posts/${id}/collect`,
      );
      setCollected(result.collected);
      setCollects(result.total);
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActing(null);
    }
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!id || !text || commenting) return;
    setCommenting(true);
    setError(null);
    try {
      const created = await apiPost<CommentSummary>(`/api/posts/${id}/comments`, {
        content: text,
      });
      setComments((current) => [created, ...current]);
      setPost((current) =>
        current ? { ...current, comments: (current.comments ?? 0) + 1 } : current,
      );
      setCommentText('');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof Error ? err.message : '评论失败');
    } finally {
      setCommenting(false);
    }
  };

  const deletePost = async () => {
    if (!id || acting) return;
    setActing('delete');
    setError(null);
    try {
      await apiPost(`/api/posts/${id}/admin`, {
        action: 'delete',
        reason: '作者删除',
      });
      router.replace('/my-posts');
    } catch (err) {
      if (!requireLogin(err)) setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingView label="正在加载帖子..." />;
  if (!post) return <ErrorView message={error ?? '帖子不存在'} onRetry={load} />;
  const isAuthor = Boolean(me?.id && post.author?.id === me.id);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.detailTopbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => router.back()} style={styles.topIconButton}>
            <Text style={styles.topIconText}>‹</Text>
          </Pressable>
          <View style={styles.detailLogo}>
            <View style={styles.logoLeafTall} />
            <View style={styles.logoLeafSmall} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collected ? '取消收藏' : '收藏'}
            onPress={toggleCollect}
            disabled={acting !== null}
            style={styles.topIconButton}
          >
            <Text style={[styles.topIconText, collected && styles.topIconActive]}>
              {collected ? '♥' : '♡'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {images.length > 0 ? (
            <View style={styles.galleryBlock}>
              <Pressable onPress={() => setPreviewIndex(0)} style={styles.heroImageWrap}>
                <Image source={{ uri: images[0] }} style={styles.heroImage} />
              </Pressable>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbStrip}
              >
                {images.slice(0, 8).map((image, index) => (
                  <Pressable
                    key={`${image}-${index}`}
                    onPress={() => setPreviewIndex(index)}
                    style={[styles.thumbButton, index === 0 && styles.thumbActive]}
                  >
                    <Image source={{ uri: image }} style={styles.thumbImage} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <Text style={styles.title}>{post.title}</Text>
          {post.contentText ? <Text style={styles.contentText}>{post.contentText}</Text> : null}

          <View style={styles.authorRow}>
            <Pressable
              disabled={!post.author?.id}
              onPress={() => post.author?.id && router.push(`/user/${post.author.id}`)}
            >
              <Avatar uri={post.author?.avatar} name={post.author?.name ?? '肉友'} />
            </Pressable>
            <View style={styles.authorInfo}>
              <Text style={styles.authorName}>{post.author?.name ?? '肉友'}</Text>
              <Text style={styles.meta}>
                {post.board?.name ?? '社区'} · Lv.{post.author?.level ?? 1}
              </Text>
            </View>
            {isAuthor ? (
              <View style={styles.adminActions}>
                <Pressable onPress={() => router.push(`/post-edit/${post.id}`)} style={styles.adminButton}>
                  <Text style={styles.adminButtonText}>编辑</Text>
                </Pressable>
                <Pressable onPress={deletePost} disabled={acting !== null} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>{acting === 'delete' ? '...' : '删除'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {post.tags?.length ? (
            <View style={styles.tags}>
              {post.tags.slice(0, 8).map((tag) => (
                <Text key={tag} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.stats}>
            <Text style={styles.stat}>看 {post.views ?? 0}</Text>
            <Text style={styles.stat}>评 {post.comments ?? comments.length}</Text>
            <Text style={styles.stat}>赞 {likes}</Text>
            {collects > 0 ? <Text style={styles.stat}>藏 {collects}</Text> : null}
          </View>
        </View>

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>评论</Text>
          <Text style={styles.meta}>{comments.length} 条</Text>
        </View>

        {comments.length ? (
          comments.map((comment) => <CommentCard key={comment.id} comment={comment} />)
        ) : (
          <View style={styles.empty}>
            <Text style={styles.meta}>还没有评论</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="写评论..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          style={styles.commentInput}
        />
        <Pressable
          onPress={submitComment}
          disabled={!commentText.trim() || commenting}
          style={[styles.sendButton, (!commentText.trim() || commenting) && styles.buttonDisabled]}
        >
          {commenting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>发</Text>}
        </Pressable>
        <Pressable onPress={toggleLike} disabled={acting !== null} style={styles.iconButton}>
          <Text style={[styles.iconButtonText, liked && styles.activeText]}>
            {acting === 'like' ? '...' : liked ? '已赞' : '赞'}
          </Text>
        </Pressable>
        <Pressable onPress={toggleCollect} disabled={acting !== null} style={styles.iconButton}>
          <Text style={[styles.iconButtonText, collected && styles.activeText]}>
            {acting === 'collect' ? '...' : collected ? '已藏' : '藏'}
          </Text>
        </Pressable>
      </View>
      <ImagePreview
        images={images}
        visible={previewIndex !== null}
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
      />
    </KeyboardAvoidingView>
  );
}

function CommentCard({ comment }: { comment: CommentSummary }) {
  const text = comment.contentText || stripHtml(comment.content);
  return (
    <View style={styles.commentCard}>
      <Avatar uri={comment.author?.avatar} name={comment.author?.name ?? '肉友'} small />
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentAuthor}>{comment.author?.name ?? '肉友'}</Text>
          <Text style={styles.meta}>赞 {comment.likes ?? 0}</Text>
        </View>
        <Text style={styles.commentText}>{text || '图片评论'}</Text>
      </View>
    </View>
  );
}

function Avatar({ uri, name, small }: { uri?: string | null; name: string; small?: boolean }) {
  const source = absoluteAssetUrl(uri);
  const size = small ? 32 : 42;
  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.avatar, { height: size, width: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: 64,
    paddingBottom: 118,
  },
  detailTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
  },
  topIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  topIconText: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '500',
    lineHeight: 30,
  },
  topIconActive: {
    color: colors.leafDeep,
  },
  detailLogo: {
    position: 'relative',
    height: 34,
    width: 34,
  },
  logoLeafTall: {
    position: 'absolute',
    left: 8,
    top: 2,
    height: 28,
    width: 11,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    backgroundColor: colors.leaf,
    transform: [{ rotate: '-14deg' }],
  },
  logoLeafSmall: {
    position: 'absolute',
    right: 6,
    bottom: 3,
    height: 22,
    width: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: colors.ink,
    transform: [{ rotate: '28deg' }],
  },
  card: {
    ...shadows.card,
    borderRadius: radii.lg,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  authorInfo: {
    flex: 1,
  },
  adminActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  adminButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  adminButtonText: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  deleteButton: {
    borderRadius: radii.pill,
    backgroundColor: '#fee2e2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '900',
  },
  authorName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  avatar: {
    backgroundColor: colors.sand,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sand,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 15,
    fontWeight: '800',
  },
  title: {
    marginTop: spacing.lg,
    color: colors.ink,
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 28,
  },
  contentText: {
    marginTop: spacing.sm,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 24,
  },
  galleryBlock: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroImageWrap: {
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.sand,
  },
  heroImage: {
    aspectRatio: 1.22,
    width: '100%',
  },
  thumbStrip: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
  thumbButton: {
    overflow: 'hidden',
    height: 58,
    width: 76,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.sand,
  },
  thumbActive: {
    borderColor: colors.leafDeep,
  },
  thumbImage: {
    height: '100%',
    width: '100%',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tag: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    backgroundColor: colors.leafSoft,
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  stat: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineError: {
    color: '#b91c1c',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  commentCard: {
    ...shadows.card,
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  commentBody: {
    flex: 1,
    gap: spacing.xs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  commentAuthor: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  commentText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  empty: {
    ...shadows.card,
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 0,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  actionBar: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    ...shadows.floating,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  commentInput: {
    flex: 1,
    maxHeight: 86,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.backgroundSoft,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.leaf,
  },
  sendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    minWidth: 48,
    borderRadius: 21,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.sm,
  },
  iconButtonText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  activeText: {
    color: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
