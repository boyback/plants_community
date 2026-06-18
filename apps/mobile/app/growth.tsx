import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import {
  apiGet,
  apiPost,
  type LevelsResponse,
  type PointsLedgerItem,
  type PointsSummary,
  type TaskItem,
  type TasksResponse,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type Tab = 'tasks' | 'ledger';

const tabs: { key: Tab; label: string }[] = [
  { key: 'tasks', label: '任务' },
  { key: 'ledger', label: '流水' },
];

export default function GrowthScreen() {
  const [tab, setTab] = useState<Tab>('tasks');
  const [points, setPoints] = useState<PointsSummary | null>(null);
  const [tasks, setTasks] = useState<TasksResponse | null>(null);
  const [levels, setLevels] = useState<LevelsResponse | null>(null);
  const [ledger, setLedger] = useState<PointsLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [pointsData, tasksData, levelsData, ledgerData] =
        await Promise.all([
          apiGet<PointsSummary>('/api/points/me'),
          apiGet<TasksResponse>('/api/tasks'),
          apiGet<LevelsResponse>('/api/levels'),
          apiGet<{ items: PointsLedgerItem[] }>('/api/points/ledger?limit=30'),
        ]);
      setPoints(pointsData);
      setTasks(tasksData);
      setLevels(levelsData);
      setLedger(ledgerData.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '等级钻石加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const progress = useMemo(() => {
    if (!points || !levels) return null;
    const sorted = [...levels.levels].sort((a, b) => a.level - b.level);
    const current = sorted.filter((item) => item.expRequired <= points.exp).at(-1) ?? sorted[0];
    const next = sorted.find((item) => item.expRequired > points.exp) ?? null;
    const base = current?.expRequired ?? 0;
    const total = next ? Math.max(1, next.expRequired - base) : 1;
    const currentExp = Math.max(0, points.exp - base);
    return {
      currentName: current?.name ?? `Lv.${points.level}`,
      nextName: next?.name ?? '满级',
      percent: next ? Math.min(100, Math.round((currentExp / total) * 100)) : 100,
      currentExp,
      total,
    };
  }, [levels, points]);

  const allTasks = useMemo(() => {
    if (!tasks) return [];
    return [
      { title: '每日任务', items: tasks.daily },
      { title: '月度任务', items: tasks.monthly },
      { title: '成就任务', items: tasks.achievement },
    ].filter((group) => group.items.length > 0);
  }, [tasks]);

  const claimTask = async (task: TaskItem) => {
    setActingId(task.id);
    setMessage(null);
    try {
      const result = await apiPost<{ rewardPoints: number; rewardExp: number }>(
        '/api/tasks/claim',
        { taskId: task.id },
      );
      setMessage(`已领取：钻石 +${result.rewardPoints}，经验 +${result.rewardExp}`);
      void load(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '领取失败');
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <LoadingView label="正在加载等级钻石..." />;
  if (error && !points) return <ErrorView message={error} onRetry={() => load()} />;

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
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.level}>Lv.{points?.level ?? 1}</Text>
            <Text style={styles.levelName}>{progress?.currentName ?? '等级'}</Text>
          </View>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreValue}>{points?.balance ?? 0}</Text>
            <Text style={styles.scoreLabel}>钻石</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress?.percent ?? 0}%` }]} />
        </View>
        <Text style={styles.meta}>
          经验 {points?.exp ?? 0} · 距 {progress?.nextName ?? '下一级'} {progress ? `${progress.currentExp}/${progress.total}` : ''}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <Stat title="累计获得" value={points?.earned ?? 0} />
        <Stat title="累计消费" value={points?.spent ?? 0} />
        <Stat title="当前等级" value={points?.level ?? 1} />
        <Stat title="当前经验" value={points?.exp ?? 0} />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.segmented}>
        {tabs.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[styles.segment, tab === item.key && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, tab === item.key && styles.segmentTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'tasks' ? (
        <>
          {allTasks.map((group) => (
            <View key={group.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{group.title}</Text>
              {group.items.map((task) => (
                <TaskCard key={task.id} task={task} acting={actingId === task.id} onClaim={() => claimTask(task)} />
              ))}
            </View>
          ))}

        </>
      ) : (
        <View style={styles.section}>
          {ledger.length ? (
            ledger.map((item) => <LedgerCard key={item.id} item={item} />)
          ) : (
            <View style={styles.empty}>
              <Text style={styles.meta}>暂无钻石流水</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );
}

function TaskCard({ task, acting, onClaim }: { task: TaskItem; acting: boolean; onClaim: () => void }) {
  const percent = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100));
  return (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{task.icon ? `${task.icon} ` : ''}{task.title}</Text>
        <Text style={styles.cardDesc}>{task.description}</Text>
        <View style={styles.smallProgressTrack}>
          <View style={[styles.smallProgressFill, { width: `${percent}%` }]} />
        </View>
        <Text style={styles.meta}>
          {task.progress}/{task.target} · 钻石 +{task.rewardPoints} · 经验 +{task.rewardExp}
        </Text>
      </View>
      <ClaimButton
        disabled={!task.completed || task.claimed || acting}
        claimed={task.claimed}
        acting={acting}
        onPress={onClaim}
      />
    </View>
  );
}

function ClaimButton({
  disabled,
  claimed,
  acting,
  onPress,
}: {
  disabled: boolean;
  claimed: boolean;
  acting: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.claimButton, disabled && styles.claimDisabled]}>
      <Text style={styles.claimText}>{acting ? '领取中' : claimed ? '已领' : '领取'}</Text>
    </Pressable>
  );
}

function LedgerCard({ item }: { item: PointsLedgerItem }) {
  const positive = item.delta >= 0;
  return (
    <View style={styles.ledgerCard}>
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{item.remark || eventLabel(item.type)}</Text>
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()} · 余额 {item.balance}</Text>
      </View>
      <Text style={[styles.delta, positive ? styles.deltaPlus : styles.deltaMinus]}>
        {positive ? '+' : ''}{item.delta}
      </Text>
    </View>
  );
}

function eventLabel(type: string) {
  if (type === 'signin') return '签到';
  if (type === 'post_create') return '发布帖子';
  if (type === 'comment_create') return '发表评论';
  if (type === 'task_complete') return '任务奖励';
  if (type === 'exchange_skin') return '兑换皮肤';
  if (type === 'exchange_vip') return '兑换会员';
  return type;
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  hero: {
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  level: {
    color: colors.leaf,
    fontSize: 34,
    fontWeight: '900',
  },
  levelName: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  scoreBox: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  scoreValue: {
    color: colors.leaf,
    fontSize: 20,
    fontWeight: '900',
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    overflow: 'hidden',
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.leaf,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flexGrow: 1,
    minWidth: '47%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  statValue: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#eaf1e7',
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 11,
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.leaf,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardMain: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  cardDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  smallProgressTrack: {
    overflow: 'hidden',
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
  },
  smallProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.leaf,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  claimButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  claimDisabled: {
    opacity: 0.45,
  },
  claimText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  ledgerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  delta: {
    fontSize: 18,
    fontWeight: '900',
  },
  deltaPlus: {
    color: colors.leaf,
  },
  deltaMinus: {
    color: '#dc2626',
  },
  empty: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
});
