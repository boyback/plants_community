import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { absoluteAssetUrl, apiGet, type BoardSummary } from '../../lib/api';
import { colors, radii, spacing } from '../../lib/theme';

type CategoryLevel = '1' | '2' | '3';

export default function BoardsScreen() {
  const router = useRouter();
  const [level1Categories, setLevel1Categories] = useState<BoardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLevel, setActiveLevel] = useState<CategoryLevel>('1');
  const [selectedL1, setSelectedL1] = useState<BoardSummary | null>(null);
  const [selectedL2, setSelectedL2] = useState<BoardSummary | null>(null);
  const [selectedL3, setSelectedL3] = useState<BoardSummary | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<BoardSummary[]>('/api/boards?kind=family&withSpecies=1');
      setLevel1Categories(data);
      if (data.length > 0) {
        setSelectedL1(data[0]);
        // 默认选中第一个属
        if (data[0].genera && data[0].genera.length > 0) {
          setSelectedL2(data[0].genera[0]);
          // 默认选中第一个品种
          if (data[0].genera[0].species && data[0].genera[0].species.length > 0) {
            setSelectedL3(data[0].genera[0].species[0]);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '图鉴加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSelectL1 = useCallback((category: BoardSummary) => {
    setSelectedL1(category);
    // 自动选中该科下的第一个属
    const genera = category.genera || [];
    if (genera.length > 0) {
      setSelectedL2(genera[0]);
      // 自动选中该属下的第一个品种
      const species = genera[0].species || [];
      if (species.length > 0) {
        setSelectedL3(species[0]);
      } else {
        setSelectedL3(null);
      }
    } else {
      setSelectedL2(null);
      setSelectedL3(null);
    }
  }, []);

  const handleSelectL2 = useCallback((category: BoardSummary) => {
    setSelectedL2(category);
    // 自动选中该属下的第一个品种
    const species = category.species || [];
    if (species.length > 0) {
      setSelectedL3(species[0]);
    } else {
      setSelectedL3(null);
    }
  }, []);

  const handleSelectL3 = useCallback((category: BoardSummary) => {
    setSelectedL3(category);
    // 跳转到详情页
    if (selectedL1 && selectedL2) {
      router.push(`/board/${selectedL1.slug}/${selectedL2.slug}/${category.slug}`);
    }
  }, [selectedL1, selectedL2, router]);

  if (loading) return <LoadingView label="正在加载图鉴..." />;
  if (error) return <ErrorView message={error} onRetry={load} />;

  const level2List = selectedL1?.genera || [];
  const level3List = selectedL2?.species || [];

  return (
    <View style={styles.container}>
      {/* 顶部栏 */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>图鉴</Text>
        <Pressable style={styles.searchButton} onPress={() => router.push('/search')}>
          <Text style={styles.searchIcon}>🔍</Text>
        </Pressable>
      </View>

      {/* 分类标签 */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activeLevel === '1' && styles.tabActive]}
          onPress={() => setActiveLevel('1')}
        >
          <Text style={[styles.tabText, activeLevel === '1' && styles.tabTextActive]}>科</Text>
          {activeLevel === '1' && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable
          style={[styles.tab, activeLevel === '2' && styles.tabActive]}
          onPress={() => setActiveLevel('2')}
        >
          <Text style={[styles.tabText, activeLevel === '2' && styles.tabTextActive]}>属</Text>
          {activeLevel === '2' && <View style={styles.tabIndicator} />}
        </Pressable>
        <Pressable
          style={[styles.tab, activeLevel === '3' && styles.tabActive]}
          onPress={() => setActiveLevel('3')}
        >
          <Text style={[styles.tabText, activeLevel === '3' && styles.tabTextActive]}>品种</Text>
          {activeLevel === '3' && <View style={styles.tabIndicator} />}
        </Pressable>
        <View style={styles.tabRight}>
          <Text style={styles.viewAllText}>
            查看全部 {activeLevel === '1' ? level1Categories.length : activeLevel === '2' ? level2List.length : level3List.length} {activeLevel === '1' ? '个' : '种'} →
          </Text>
        </View>
      </View>

      {/* 三栏布局 */}
      <View style={styles.threeColumns}>
        {/* 左栏：一级分类（科） */}
        <View style={styles.column}>
          <ScrollView contentContainerStyle={styles.columnContent} showsVerticalScrollIndicator={false}>
            {level1Categories.map((category) => {
              const cover = absoluteAssetUrl(category.cover);
              const isActive = selectedL1?.id === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.categoryItem, isActive && styles.categoryItemActive]}
                  onPress={() => handleSelectL1(category)}
                >
                  <View style={styles.categoryIconL1}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.categoryImageL1} />
                    ) : (
                      <View style={styles.categoryImageL1Fallback} />
                    )}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryCount}>{category.childrenCount ?? 0} 种</Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 中栏：二级分类（属） */}
        <View style={styles.column}>
          <ScrollView contentContainerStyle={styles.columnContent} showsVerticalScrollIndicator={false}>
            {level2List.map((category) => {
              const cover = absoluteAssetUrl(category.cover);
              const isActive = selectedL2?.id === category.id;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.categoryItem, isActive && styles.categoryItemActive]}
                  onPress={() => handleSelectL2(category)}
                >
                  <View style={styles.categoryIconL2}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.categoryImageL2} />
                    ) : (
                      <View style={styles.categoryImageL2Fallback} />
                    )}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {category.name}
                    </Text>
                    <Text style={styles.categoryCount}>{category.childrenCount ?? category.posts ?? 0} 种</Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* 右栏：三级分类（种）列表 */}
        <View style={styles.column}>
          <ScrollView contentContainerStyle={styles.columnContent} showsVerticalScrollIndicator={false}>
            {level3List.map((item) => {
              const cover = absoluteAssetUrl(item.cover);
              const isActive = selectedL3?.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.categoryItem, isActive && styles.categoryItemActive]}
                  onPress={() => handleSelectL3(item)}
                >
                  <View style={styles.categoryIconL3}>
                    {cover ? (
                      <Image source={{ uri: cover }} style={styles.categoryImageL3} />
                    ) : (
                      <View style={styles.categoryImageL3Fallback}>
                        <Text style={styles.categoryEmoji}>🌸</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text numberOfLines={1} style={styles.categoryName}>
                      {item.name}
                    </Text>
                  </View>
                  {isActive && <View style={styles.activeIndicator} />}
                </Pressable>
              );
            })}
            {level3List.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>暂无数据</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.ink,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.ink,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    fontSize: 18,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  tab: {
    width: '33.33%',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingLeft: 30,
    position: 'relative',
  },
  tabActive: {},
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  tabTextActive: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.leaf,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.leaf,
    borderRadius: 2,
  },
  tabRight: {
    paddingRight: spacing.lg,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.leaf,
  },
  tabSpacer: {
    flex: 1,
  },
  threeColumns: {
    flex: 1,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  column: {
    flex: 1,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  columnContent: {
    paddingVertical: spacing.sm,
    paddingBottom: 100,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    position: 'relative',
    backgroundColor: colors.background,
  },
  categoryItemActive: {
    backgroundColor: colors.backgroundSoft,
  },
  // 一级分类图标：固定大小，8px圆角
  categoryIconL1: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImageL1: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryImageL1Fallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.backgroundSoft,
  },
  // 二级分类图标：固定大小，8px圆角
  categoryIconL2: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImageL2: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryImageL2Fallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.backgroundSoft,
  },
  // 三级分类图标：正方形，8px圆角
  categoryIconL3: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImageL3: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  categoryImageL3Fallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.leafSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryInfo: {
    flex: 1,
    gap: 1,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  categoryCount: {
    fontSize: 11,
    color: colors.muted,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 3,
    backgroundColor: colors.leaf,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  emptyState: {
    width: '100%',
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
  },
});
