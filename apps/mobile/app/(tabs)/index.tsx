import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  type BannerItem,
  type BoardSummary,
  type FeedResponse,
  type HotSearchResponse,
  type HotTopic,
  type Post,
} from '../../lib/api';
import { colors, radii, shadows, spacing } from '../../lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'recommend' | 'following' | 'latest';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'following', label: '关注' },
  { key: 'latest', label: '最新' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('recommend');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      const [bannersData, topicsData, boardsData] = await Promise.all([
        apiGet<BannerItem[]>('/api/banners'),
        apiGet<HotSearchResponse>('/api/search/hot?shuffle=1'),
        apiGet<BoardSummary[]>('/api/boards?kind=family'),
      ]);
      setBanners(bannersData);
      setTopics(topicsData.hot.slice(0, 6));
      setBoards(boardsData.slice(0, 10));
    } catch (err) {
      console.error('加载首页数据失败:', err);
    }
  }, []);

  const loadFeed = useCallback(
    async (tab: TabKey, refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const url = `/api/feed?tab=${tab}${!refresh && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
        const data = await apiGet<FeedResponse>(url);

        if (refresh) {
          setPosts(data.items);
        } else {
          setPosts((prev) => (cursor ? [...prev, ...data.items] : data.items));
        }
        setCursor(data.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [cursor],
  );

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    setCursor(null);
    setPosts([]);
    void loadFeed(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    setCursor(null);
    void Promise.all([loadInitialData(), loadFeed(activeTab, true)]);
  }, [activeTab, loadFeed, loadInitialData]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && cursor) {
      void loadFeed(activeTab);
    }
  }, [activeTab, cursor, loadFeed, loadingMore]);

  if (loading && posts.length === 0) return <LoadingView label="正在加载首页..." />;
  if (error && posts.length === 0) return <ErrorView message={error} onRetry={handleRefresh} />;

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
      ListHeaderComponent={
        <>
          {/* 顶部导航 */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <View style={styles.logoLeafTall} />
                <View style={styles.logoLeafSmall} />
              </View>
              <Text style={styles.brandText}>植友圈社区</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={styles.headerButton} onPress={() => router.push('/search')}>
                <Image source={require('../../assets/images/search.png')} style={styles.headerIcon} />
              </Pressable>
              <Pressable style={styles.headerButton} onPress={() => router.push('/notifications')}>
                <Image source={require('../../assets/images/menu.png')} style={styles.headerIcon} />
              </Pressable>
            </View>
          </View>

          {/* Banner 轮播 */}
          {banners.length > 0 && <BannerCarousel items={banners} />}

          {/* 热门话题 */}
          {topics.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>热门话题</Text>
                <Pressable onPress={() => router.push('/search')}>
                  <Text style={styles.sectionMore}>查看更多 →</Text>
                </Pressable>
              </View>
              <View style={styles.topicsGrid}>
                {topics.slice(0, 4).map((topic, index) => {
                  const isTop = index < 2;
                  const gradientColors = [
                    ['#ff6b9d', '#ff8c5a'], // 粉红到橙
                    ['#ffd93d', '#ff9a3d'], // 黄到橙
                    ['#fff5e6', '#ffe6cc'], // 浅米色
                    ['#fff5e6', '#ffe6cc'], // 浅米色
                  ];
                  const bgColor = gradientColors[index];

                  // 图标资源
                  const iconMap = [
                    require('../../assets/images/topic_icon_one.png'),
                    require('../../assets/images/topic_icon_two.png'),
                    null,
                    null,
                  ];
                  const hashIconMap = [
                    require('../../assets/images/topic_icon_white.png'),
                    require('../../assets/images/topic_icon_white.png'),
                    require('../../assets/images/topic_icon_yellow.png'),
                    require('../../assets/images/topic_icon_yellow.png'),
                  ];

                  return (
                    <View key={`${topic.q}-${index}`} style={styles.topicCardWrapper}>
                      <Pressable
                        style={[
                          styles.topicCard,
                          { backgroundColor: bgColor[0] },
                          !iconMap[index] && styles.topicCardNoIcon,
                        ]}
                        onPress={() => {
                          if (topic.kind === 'topic') {
                            router.push(`/topic/${encodeURIComponent(topic.q)}`);
                          } else {
                            router.push(`/search?q=${encodeURIComponent(topic.q)}`);
                          }
                        }}
                      >
                        <View style={styles.topicCardContent}>
                          {iconMap[index] && (
                            <>
                              <Image source={iconMap[index]} style={styles.topicNumberIcon} />
                              <View style={styles.topicNumberIconPlaceholder} />
                            </>
                          )}
                          <Image source={hashIconMap[index]} style={styles.topicHashIcon} />
                          <Text style={[styles.topicCardTitle, isTop && styles.topicCardTitleTop]} numberOfLines={1}>
                            {topic.q}
                          </Text>
                        </View>
                      </Pressable>
                      {typeof topic.count === 'number' && (
                        <TopicInfoRow topic={topic} />
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* 热门板块 */}
          {boards.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🌿 热门板块</Text>
                <Pressable onPress={() => router.push('/(tabs)/boards')}>
                  <Text style={styles.sectionMore}>查看全部 →</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardsScroll}>
                {boards.map((board) => {
                  const cover = absoluteAssetUrl(board.cover);
                  return (
                    <Pressable
                      key={board.id}
                      style={styles.boardCard}
                      onPress={() => router.push(`/board/${board.slug}`)}
                    >
                      {cover ? (
                        <Image source={{ uri: cover }} style={styles.boardImage} />
                      ) : (
                        <View style={styles.boardImageFallback}>
                          <Text style={styles.boardEmoji}>🌱</Text>
                        </View>
                      )}
                      <Text style={styles.boardName} numberOfLines={1}>
                        {board.name}
                      </Text>
                      <Text style={styles.boardCount}>{board.childrenCount ?? 0} 种</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Feed Tab 切换 */}
          <View style={styles.feedTabs}>
            {TABS.map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.feedTab, activeTab === tab.key && styles.feedTabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.feedTabText, activeTab === tab.key && styles.feedTabTextActive]}>{tab.label}</Text>
                {activeTab === tab.key && <View style={styles.feedTabIndicator} />}
              </Pressable>
            ))}
          </View>
        </>
      }
      renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/post/${item.id}`)} />}
      ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingMoreText}>加载中...</Text>
          </View>
        ) : !cursor && posts.length > 0 ? (
          <View style={styles.loadingMore}>
            <Text style={styles.loadingMoreText}>— 没有更多了 —</Text>
          </View>
        ) : null
      }
    />
  );
}

function TopicInfoRow({ topic }: { topic: HotTopic }) {
  const count = topic.count ?? 0;
  return (
    <View style={styles.topicInfoRow}>
      <View style={styles.topicAvatars}>
        {topic.participants?.slice(0, 3).map((participant, pIndex) => {
          const avatar = absoluteAssetUrl(participant.avatar);
          return (
            <View
              key={participant.id}
              style={[
                styles.topicAvatar,
                { zIndex: 3 - pIndex, marginLeft: pIndex > 0 ? -8 : 0 },
              ]}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.topicAvatarImage} />
              ) : (
                <View style={styles.topicAvatarPlaceholder}>
                  <Text style={styles.topicAvatarText}>{participant.name.slice(0, 1)}</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
      <Text style={styles.topicParticipants}>{formatTopicCount(count)} 人参与</Text>
    </View>
  );
}

function formatTopicCount(count: number) {
  if (count <= 999) return String(count);
  return count.toLocaleString('en-US').replace(/,/g, '，');
}

function BannerCarousel({ items }: { items: BannerItem[] }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerWidth = SCREEN_WIDTH - spacing.md * 2;

  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollViewRef.current?.scrollTo({ x: next * bannerWidth, animated: true });
        return next;
      });
    }, 3000);
  }, [items.length, bannerWidth]);

  useEffect(() => {
    if (items.length > 1) {
      startAutoPlay();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length, startAutoPlay]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / bannerWidth);
    setActiveIndex(index);
  };

  return (
    <View style={styles.bannerContainer}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onTouchStart={() => timerRef.current && clearInterval(timerRef.current)}
        onTouchEnd={startAutoPlay}
      >
        {items.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(item.link)} style={styles.bannerSlide}>
            <Image source={{ uri: item.image }} style={styles.bannerImage} />
            <View style={styles.bannerOverlay}>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>{item.title}</Text>
                {item.subtitle && <Text style={styles.bannerSubtitle}>{item.subtitle}</Text>}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {items.length > 1 && (
        <View style={styles.bannerDots}>
          {items.map((_, index) => (
            <View key={index} style={[styles.bannerDot, index === activeIndex && styles.bannerDotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const images = (post.images?.length ? post.images : post.cover ? [post.cover] : [])
    .map(absoluteAssetUrl)
    .filter((item): item is string => !!item)
    .slice(0, 3);

  return (
    <Pressable style={styles.postCard} onPress={onPress}>
      <View style={styles.postHeader}>
        <View style={styles.postAuthorRow}>
          {post.author.avatar ? (
            <Image source={{ uri: absoluteAssetUrl(post.author.avatar) ?? undefined }} style={styles.postAvatar} />
          ) : (
            <View style={styles.postAvatarFallback}>
              <Text style={styles.postAvatarText}>{post.author.name[0]}</Text>
            </View>
          )}
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthorName}>{post.author.name}</Text>
            <Text style={styles.postMeta}>
              {post.board.name} · Lv.{post.author.level ?? 1}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.postTitle} numberOfLines={2}>
        {post.title}
      </Text>

      {post.contentText && (
        <Text style={styles.postContent} numberOfLines={3}>
          {post.contentText}
        </Text>
      )}

      {images.length > 0 && (
        <View style={styles.postImages}>
          {images.map((image, index) => (
            <Image key={`${image}-${index}`} source={{ uri: image }} style={styles.postImage} />
          ))}
        </View>
      )}

      {post.tags.length > 0 && (
        <View style={styles.postTags}>
          {post.tags.slice(0, 3).map((tag, index) => (
            <Text key={index} style={styles.postTag}>
              #{tag}
            </Text>
          ))}
        </View>
      )}

      <View style={styles.postStats}>
        <Text style={styles.postStat}>👁 {post.views}</Text>
        <Text style={styles.postStat}>💬 {post.comments}</Text>
        <Text style={styles.postStat}>❤️ {post.likes}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  logoMark: {
    position: 'relative',
    height: 28,
    width: 24,
  },
  logoLeafTall: {
    position: 'absolute',
    left: 3,
    top: 0,
    height: 22,
    width: 9,
    borderTopLeftRadius: 9,
    borderBottomRightRadius: 9,
    backgroundColor: colors.leaf,
    transform: [{ rotate: '-12deg' }],
  },
  logoLeafSmall: {
    position: 'absolute',
    right: 2,
    bottom: 1,
    height: 17,
    width: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    backgroundColor: colors.ink,
    transform: [{ rotate: '25deg' }],
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: colors.backgroundSoft,
  },
  headerIcon: {
    width: 20,
    height: 20,
  },
  headerButtonText: {
    fontSize: 18,
  },
  bannerContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  bannerSlide: {
    width: SCREEN_WIDTH - spacing.md * 2,
    height: (SCREEN_WIDTH - spacing.md * 2) * 0.45,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.backgroundSoft,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  bannerTextContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  bannerDots: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  bannerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  bannerDotActive: {
    width: 16,
    backgroundColor: '#ffffff',
  },
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.ink,
  },
  sectionMore: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.leaf,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  topicCardWrapper: {
    width: '48%',
  },
  topicCard: {
    width: '100%',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    height: 26,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  topicCardNoIcon: {
    paddingHorizontal: 22,
  },
  topicCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
  },
  topicNumberIcon: {
    width: 26,
    height: 26,
    position: 'absolute',
    top: -8,
    left: 0,
    marginRight: 7,
  },
  topicNumberIconPlaceholder: {
    width: 20,
    height: 20,
    marginRight: 7,
  },
  topicHashIcon: {
    width: 12,
    height: 12,
  },
  topicCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#8b5a3c',
  },
  topicCardTitleTop: {
    color: '#ffffff',
  },
  topicInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    minHeight: 28,
  },
  topicAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  topicAvatarImage: {
    width: 28,
    height: 28,
  },
  topicAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicAvatarText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  topicParticipants: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    marginLeft: 8,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundSoft,
    minWidth: '48%',
    maxWidth: '48%',
  },
  topicRank: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: colors.leafSoft,
  },
  topicRankHot: {
    backgroundColor: colors.leaf,
  },
  topicRankText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.leaf,
  },
  topicRankTextHot: {
    color: '#ffffff',
  },
  topicTag: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  topicCount: {
    fontSize: 11,
    color: colors.muted,
  },
  boardsScroll: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  boardCard: {
    width: 90,
    alignItems: 'center',
    gap: spacing.xs,
  },
  boardImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.backgroundSoft,
  },
  boardImageFallback: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardEmoji: {
    fontSize: 28,
  },
  boardName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  boardCount: {
    fontSize: 10,
    color: colors.muted,
  },
  feedTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  feedTab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },
  feedTabActive: {},
  feedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  feedTabTextActive: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.leaf,
  },
  feedTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.leaf,
    borderRadius: 1,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    ...shadows.card,
  },
  postHeader: {
    marginBottom: spacing.sm,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSoft,
  },
  postAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.leaf,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.ink,
  },
  postMeta: {
    fontSize: 10,
    color: colors.muted,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.ink,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  postContent: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  postImages: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  postImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.backgroundSoft,
  },
  postTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  postTag: {
    fontSize: 11,
    color: colors.leaf,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 3,
  },
  postStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  postStat: {
    fontSize: 11,
    color: colors.muted,
  },
  postSeparator: {
    height: spacing.sm,
  },
  loadingMore: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 12,
    color: colors.muted,
  },
});
