import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { absoluteAssetUrl, apiGet, type BoardDetailResponse } from '../../lib/api';
import { colors, radii, shadows, spacing } from '../../lib/theme';

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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!apiPath) return;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      // 添加 withSpecies 参数来获取三级数据
      const result = await apiGet<BoardDetailResponse>(`/api/mobile/boards/${apiPath}?withSpecies=1`);
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

  const images = useMemo(() => {
    if (!data?.detail) return [];
    const gallery = data.detail.gallery || [];
    const cover = data.detail.cover;
    if (cover && !gallery.includes(cover)) {
      return [cover, ...gallery].map(absoluteAssetUrl).filter((url): url is string => !!url);
    }
    return gallery.map(absoluteAssetUrl).filter((url): url is string => !!url);
  }, [data]);

  if (loading) return <LoadingView label="正在加载图鉴..." />;
  if (!data) return <ErrorView message={error ?? '图鉴不存在'} onRetry={() => load()} />;

  const isSpecies = data.type === 'species';

  return (
    <>
      <Stack.Screen
        options={{
          title: data.detail.name,
          headerStyle: { backgroundColor: colors.background },
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable style={styles.headerButton}>
                <Text style={styles.headerIcon}>♡</Text>
              </Pressable>
              <Pressable style={styles.headerButton}>
                <Text style={styles.headerIcon}>⤴</Text>
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
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
        {/* 图片轮播区域 */}
        {images.length > 0 && (
          <View style={styles.gallerySection}>
            <Image source={{ uri: images[activeImageIndex] }} style={styles.heroImage} />
            {images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbScroll}>
                <View style={styles.thumbRow}>
                  {images.map((img, idx) => (
                    <Pressable key={idx} onPress={() => setActiveImageIndex(idx)}>
                      <Image
                        source={{ uri: img }}
                        style={[styles.thumbImage, activeImageIndex === idx && styles.thumbImageActive]}
                      />
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* 基本信息 */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <View style={styles.plantIcon}>
              <Text style={styles.plantIconText}>🌿</Text>
            </View>
            <Text style={styles.plantName}>{data.detail.name}</Text>
          </View>
          {data.detail.latinName && <Text style={styles.latinName}>{data.detail.latinName}</Text>}

          {/* 养护标签 */}
          {isSpecies && (
            <View style={styles.tagRow}>
              {data.detail.watering === '少' && <Tag label="耐旱" />}
              {data.detail.light === '半阴' && <Tag label="喜阴" />}
              {data.detail.hardiness && <Tag label="喜凉爽" />}
              {data.detail.growthType === '慢' && <Tag label="生长缓慢" />}
            </View>
          )}

          {/* 植物简介 */}
          {data.detail.description && (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>植物简介</Text>
              <Text style={styles.descText}>{data.detail.description}</Text>
            </View>
          )}

          {/* 养护要点 - 图标化 */}
          {isSpecies && (
            <View style={styles.careSection}>
              <Text style={styles.sectionTitle}>养护要点</Text>
              <View style={styles.careGrid}>
                <CareItem icon="☀️" label="光照" value={data.detail.light || '充足光照'} />
                <CareItem icon="💧" label="浇水" value={data.detail.watering || '见干见湿'} />
                <CareItem icon="🌡️" label="温度" value="15-25℃" />
                <CareItem icon="💨" label="湿度" value="40-60%" />
                <CareItem icon="🌱" label="土壤" value="疏松透气" />
                <CareItem icon="🌿" label="施肥" value="春秋施肥" />
              </View>
            </View>
          )}

          {/* 植物信息 */}
          {isSpecies && (
            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>植物信息</Text>
              <View style={styles.infoTable}>
                {data.detail.originRegion && <InfoRow label="产地" value={data.detail.originRegion} />}
                <InfoRow label="生长习性" value="喜光耐旱，适合室内养护" />
                <InfoRow label="适宜温度" value="15 ~ 25℃" />
                {data.detail.hardiness && <InfoRow label="耐寒性" value={data.detail.hardiness} />}
                <InfoRow label="耐热性" value="不耐高温 35℃" />
                <InfoRow label="浇水频率" value={data.detail.watering || '春秋 7-10 天一次'} />
                <InfoRow label="宜繁殖方式" value="叶插、扦插、播种" />
                {data.detail.growthType && <InfoRow label="生长周期" value={data.detail.growthType} />}
              </View>
            </View>
          )}

          {/* 生长周期时间轴 */}
          {isSpecies && (
            <View style={styles.timelineSection}>
              <Text style={styles.sectionTitle}>生长周期</Text>
              <View style={styles.timeline}>
                <TimelineItem season="春季" period="(3-5月)" status="active" description="生长旺盛期，需充足光照和水分" />
                <TimelineItem season="夏季" period="(6-8月)" status="active" description="注意遮阴，减少浇水" />
                <TimelineItem season="秋季" period="(9-11月)" status="active" description="生长期，适合繁殖" />
                <TimelineItem season="冬季" period="(12-2月)" status="dormant" description="休眠期，控水保温" />
              </View>
            </View>
          )}

          {/* 常见问题 FAQ */}
          {isSpecies && (
            <View style={styles.faqSection}>
              <Text style={styles.sectionTitle}>常见问题</Text>
              <View style={styles.faqList}>
                <FaqItem
                  question="吉娃莲叶片变软怎么办？"
                  answer="可能是缺水或根系问题。检查土壤湿度，如果干燥需要浇水；如果土壤湿润，可能是根系腐烂，需要检查根部。"
                  expanded={expandedFaq === 0}
                  onToggle={() => setExpandedFaq(expandedFaq === 0 ? null : 0)}
                />
                <FaqItem
                  question="叶片为什么会掉？"
                  answer="正常的新陈代谢会导致底部老叶脱落。如果大量掉叶，可能是浇水过多、光照不足或温度过低。"
                  expanded={expandedFaq === 1}
                  onToggle={() => setExpandedFaq(expandedFaq === 1 ? null : 1)}
                />
                <FaqItem
                  question="如何让叶片更鲜艳？"
                  answer="增加光照时间，适当控水，温差大的环境有助于上色。春秋季节是最佳上色期。"
                  expanded={expandedFaq === 2}
                  onToggle={() => setExpandedFaq(expandedFaq === 2 ? null : 2)}
                />
                <FaqItem
                  question="为什么这么慢？"
                  answer="多肉植物生长速度较慢是正常现象。保证充足光照、适量浇水和施肥可以促进生长。"
                  expanded={expandedFaq === 3}
                  onToggle={() => setExpandedFaq(expandedFaq === 3 ? null : 3)}
                />
                <FaqItem
                  question="吉娃莲可以淋雨吗？"
                  answer="不建议淋雨。雨水可能导致叶片积水腐烂，尤其是夏季高温时期。如果淋雨后要及时吹干叶心积水。"
                  expanded={expandedFaq === 4}
                  onToggle={() => setExpandedFaq(expandedFaq === 4 ? null : 4)}
                />
              </View>
            </View>
          )}

          {/* 相关品种推荐 */}
          {data.related.length > 0 && (
            <View style={styles.relatedSection}>
              <Text style={styles.sectionTitle}>相关品种</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.relatedRow}>
                  {data.related.slice(0, 6).map((item) => {
                    const cover = absoluteAssetUrl(item.cover);
                    return (
                      <Pressable
                        key={item.id}
                        style={styles.relatedCard}
                        onPress={() => router.push(item.path)}
                      >
                        {cover ? (
                          <Image source={{ uri: cover }} style={styles.relatedImage} />
                        ) : (
                          <View style={styles.relatedImageFallback} />
                        )}
                        <Text numberOfLines={1} style={styles.relatedName}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* 底部固定操作按钮 */}
      <View style={styles.bottomBar}>
        <Pressable style={styles.collectButton}>
          <Text style={styles.collectButtonText}>1G 收藏在图鉴</Text>
        </Pressable>
        <Pressable style={styles.similarButton}>
          <Text style={styles.similarButtonText}>💚 查看相似花卉 →</Text>
        </Pressable>
      </View>
    </>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function CareItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.careItem}>
      <Text style={styles.careIcon}>{icon}</Text>
      <Text style={styles.careLabel}>{label}</Text>
      <Text style={styles.careValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TimelineItem({
  season,
  period,
  status,
  description,
}: {
  season: string;
  period: string;
  status: 'active' | 'dormant';
  description: string;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, status === 'active' && styles.timelineDotActive]} />
        <View style={styles.timelineLine} />
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineSeason}>{season}</Text>
          <Text style={styles.timelinePeriod}>{period}</Text>
        </View>
        <Text style={styles.timelineDesc}>{description}</Text>
      </View>
    </View>
  );
}

function FaqItem({
  question,
  answer,
  expanded,
  onToggle,
}: {
  question: string;
  answer: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.faqItem}>
      <Pressable style={styles.faqQuestion} onPress={onToggle}>
        <Text style={styles.faqQuestionIcon}>Q</Text>
        <Text style={styles.faqQuestionText}>{question}</Text>
        <Text style={styles.faqToggle}>{expanded ? '▼' : '▶'}</Text>
      </Pressable>
      {expanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 20,
    color: colors.ink,
  },
  gallerySection: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundSoft,
  },
  thumbScroll: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  thumbImage: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbImageActive: {
    borderColor: colors.leaf,
  },
  infoCard: {
    gap: spacing.lg,
    padding: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plantIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.leafSoft,
  },
  plantIconText: {
    fontSize: 20,
  },
  plantName: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: colors.ink,
  },
  latinName: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.muted,
    marginTop: -spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.leafSoft,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.leaf,
  },
  descSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.ink,
  },
  descText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  careSection: {
    gap: spacing.md,
  },
  careGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  careItem: {
    width: '30%',
    minWidth: 100,
    alignItems: 'center',
    gap: spacing.xs,
  },
  careIcon: {
    fontSize: 32,
  },
  careLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  careValue: {
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
  },
  infoSection: {
    gap: spacing.md,
  },
  infoTable: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  timelineSection: {
    gap: spacing.md,
  },
  timeline: {
    gap: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.background,
  },
  timelineDotActive: {
    backgroundColor: colors.leaf,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timelineSeason: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ink,
  },
  timelinePeriod: {
    fontSize: 12,
    color: colors.muted,
  },
  timelineDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  faqSection: {
    gap: spacing.md,
  },
  faqList: {
    gap: spacing.sm,
  },
  faqItem: {
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  faqQuestionIcon: {
    width: 24,
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '900',
    color: colors.leaf,
    backgroundColor: colors.leafSoft,
    borderRadius: 12,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  faqToggle: {
    fontSize: 10,
    color: colors.muted,
  },
  faqAnswer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: 52,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  relatedSection: {
    gap: spacing.md,
  },
  relatedRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  relatedCard: {
    width: 100,
    gap: spacing.xs,
  },
  relatedImage: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSoft,
  },
  relatedImageFallback: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    backgroundColor: colors.backgroundSoft,
  },
  relatedName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  collectButton: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.leaf,
    backgroundColor: colors.surface,
  },
  collectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.leaf,
  },
  similarButton: {
    flex: 2,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.leaf,
  },
  similarButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
