'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Empty } from '@/components/ui/Empty';
import { Icon } from '@/components/ui/Icon';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import type { TaskItem } from '@/lib/types';
import styles from './page.module.scss';

type TaskDisplayItem = TaskItem;

const SEASON_QUESTS = [
  {
    id: 'season-summer-guard',
    slug: 'season-summer-guard',
    kind: 'achievement',
    title: '夏季守护',
    description: '分享 1 条度夏经验，并回复 2 个求助帖',
    icon: '🌿',
    rewardPoints: 80,
    rewardExp: 30,
    target: 100,
    progress: 42,
    completed: false,
    claimed: false
  },
  {
    id: 'season-bloom-recorder',
    slug: 'season-bloom-recorder',
    kind: 'achievement',
    title: '开花记录官',
    description: '上传开花图，给同属品种补充花期参考',
    icon: '🌸',
    rewardPoints: 60,
    rewardExp: 25,
    target: 100,
    progress: 68,
    completed: false,
    claimed: false
  },
  {
    id: 'season-newbie-guide',
    slug: 'season-newbie-guide',
    kind: 'achievement',
    title: '新手引路人',
    description: '帮助新手村问题获得有效回复',
    icon: '🧭',
    rewardPoints: 50,
    rewardExp: 20,
    target: 100,
    progress: 25,
    completed: false,
    claimed: false
  }
] satisfies TaskDisplayItem[];

const QUALITY_QUESTS = [
  {
    id: 'quality-favorite-post',
    slug: 'quality-favorite-post',
    kind: 'achievement',
    title: '被收藏的养护帖',
    description: '帖子被 3 位肉友收藏',
    icon: '🔖',
    rewardPoints: 120,
    rewardExp: 40,
    target: 3,
    progress: 0,
    completed: false,
    claimed: false
  },
  {
    id: 'quality-helpful-reply',
    slug: 'quality-helpful-reply',
    kind: 'achievement',
    title: '有效回复',
    description: '评论被点赞或被楼主认可',
    icon: '👍',
    rewardPoints: 80,
    rewardExp: 30,
    target: 1,
    progress: 0,
    completed: false,
    claimed: false
  },
  {
    id: 'quality-archive-approved',
    slug: 'quality-archive-approved',
    kind: 'achievement',
    title: '图鉴贡献通过',
    description: '补充资料通过审核',
    icon: '✅',
    rewardPoints: 150,
    rewardExp: 50,
    target: 1,
    progress: 0,
    completed: false,
    claimed: false
  }
] satisfies TaskDisplayItem[];

export default function TasksPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const { t } = useI18n();
  const [tasks, setTasks] = useState<{
    daily: TaskItem[];
    monthly: TaskItem[];
    achievement: TaskItem[];
  }>({ daily: [], monthly: [], achievement: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const taskResult = user
        ? await api.get<typeof tasks>('/api/tasks').catch(() => ({
            daily: [],
            monthly: [],
            achievement: []
          }))
        : { daily: [], monthly: [], achievement: [] };
      setTasks(taskResult);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const claimTask = async (task: TaskDisplayItem) => {
    setBusyId(task.id);
    try {
      const result = await api.post<{ rewardPoints: number; rewardExp?: number }>('/api/tasks/claim', {
        taskId: task.id
      });
      const exp = result.rewardExp ?? task.rewardExp;
      toast.success(`领取成功，获得 ${result.rewardPoints} 钻石${exp > 0 ? `、${exp} EXP` : ''}`);
      void load();
      refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('tasks.claimFail'));
    } finally {
      setBusyId(null);
    }
  };

  const growthTasks = useMemo<TaskDisplayItem[]>(
    () => [...tasks.achievement, ...SEASON_QUESTS, ...QUALITY_QUESTS],
    [tasks.achievement]
  );
  const stats = useMemo(() => makeStats(tasks.daily, growthTasks), [growthTasks, tasks.daily]);
  const dailyPercent = percent(stats.dailyCompleted, Math.max(stats.dailyTotal, 1));

  if (!authLoading && !user) {
    return (
      <AppShell showFloatingAi={false} className={styles.shell}>
        <main className={styles.page}>
          <div className={styles.loginCard}>
            <span className={styles.loginIcon}>
              <Icon name="trophy" size={26} />
            </span>
            <h1>{t('tasks.loginRequired')}</h1>
            <p>登录后查看每日任务、成长任务和可领取奖励。</p>
            <Link href="/login?redirect=/tasks">去登录</Link>
          </div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell showFloatingAi={false} className={styles.shell}>
      <main className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.hero}>
              <div className={styles.heroContent}>
                <div className={styles.heroTitle}>
                  <span className={styles.seedIcon}>
                    <Icon name="plants" size={22} />
                  </span>
                  <div>
                    <h1>任务中心</h1>
                    <p>完成任务，获取奖励，见证你的成长</p>
                  </div>
                </div>

                <div className={styles.heroStats}>
                  <MetricCard label="今日任务" value={`${stats.dailyCompleted}/${stats.dailyTotal || 0}`} detail="每天 0 点重置" />
                  <MetricCard label="成长任务" value={`${stats.growthCompleted}/${stats.growthTotal || 0}`} detail="长期目标与当季挑战" />
                  <MetricCard
                    label="任务完成度"
                    value={`${stats.completed}/${stats.total || 0}`}
                    detail="当前任务进度"
                    progress={stats.total ? percent(stats.completed, stats.total) : 0}
                  />
                  <MetricCard
                    label="奖励统计"
                    value={`+${stats.rewardExp}`}
                    detail={`钻石 +${stats.rewardPoints}`}
                    accent="exp"
                  />
                </div>
              </div>
            </section>

            {loading ? (
              <div className={styles.loading}>{t('common.loading')}</div>
            ) : (
              <div className={styles.taskStack}>
                <TaskGroup
                  title="每日任务"
                  subtitle="每天 0 点重置"
                  tasks={tasks.daily}
                  busyId={busyId}
                  onClaim={claimTask}
                />
                <TaskGroup
                  title="成长任务"
                  subtitle="长期达成 + 当季主题任务"
                  tasks={growthTasks}
                  busyId={busyId}
                  onClaim={claimTask}
                  optional
                />
              </div>
            )}
          </div>

          <aside className={styles.sideRail}>
            <CompletionCard completed={stats.dailyCompleted} total={stats.dailyTotal} percent={dailyPercent} />
            <RewardInfoCard />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
  progress,
  accent
}: {
  label: string;
  value: string | number;
  detail: string;
  progress?: number;
  accent?: 'exp';
}) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong className={accent === 'exp' ? styles.metricExp : undefined}>{value}</strong>
      <small>{detail}</small>
      {typeof progress === 'number' ? (
        <div className={styles.metricTrack}>
          <span style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function TaskGroup({
  title,
  subtitle,
  tasks,
  busyId,
  onClaim,
  optional = false
}: {
  title: string;
  subtitle: string;
  tasks: TaskDisplayItem[];
  busyId: string | null;
  onClaim: (task: TaskDisplayItem) => void;
  optional?: boolean;
}) {
  if (tasks.length === 0 && optional) return null;
  const completed = tasks.filter((task) => task.completed).length;

  return (
    <section className={styles.taskCard}>
      <header className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>已完成 {completed} / {tasks.length}</span>
      </header>

      {tasks.length === 0 ? (
        <Empty icon="✓" title="暂无任务" desc="任务配置后会显示在这里" />
      ) : (
        <ul className={styles.taskList}>
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} busy={busyId === task.id} onClaim={onClaim} />
          ))}
        </ul>
      )}
    </section>
  );
}

function TaskRow({ task, busy, onClaim }: { task: TaskDisplayItem; busy: boolean; onClaim: (task: TaskDisplayItem) => void }) {
  const progress = percent(task.progress, task.target);

  return (
    <li className={styles.taskRow}>
      <span className={styles.taskIcon}>{task.icon}</span>
      <div className={styles.taskInfo}>
        <div className={styles.taskMainLine}>
          <div className={styles.taskLabel}>
            <div className={styles.taskTitleLine}>
              <strong>{task.title}</strong>
              {task.completed ? <span className={styles.donePill}>已完成</span> : null}
            </div>
            <p>{task.description}</p>
          </div>

          <div className={styles.progressLine}>
            <div className={styles.progressTrack}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <span>
              {task.progress} / {task.target}
            </span>
          </div>

          <div className={styles.rewardCell}>
            <div className={styles.rewardChips}>
              {task.rewardPoints > 0 ? <span className={styles.diamondChip}>+{task.rewardPoints} 钻石</span> : null}
              {task.rewardExp > 0 ? <span className={styles.expChip}>+{task.rewardExp} EXP</span> : null}
            </div>
            {task.completed && !task.claimed ? (
              <button type="button" className={styles.primaryAction} disabled={busy} onClick={() => onClaim(task)}>
                {busy ? '领取中' : '领取'}
              </button>
            ) : task.claimed ? (
              <span className={styles.claimedPill}>已领取</span>
            ) : (
              <Link href={taskHref(task)} className={styles.secondaryAction}>
                去完成
              </Link>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

function CompletionCard({ completed, total, percent }: { completed: number; total: number; percent: number }) {
  const circleStyle = { '--progress': `${percent}%` } as CSSProperties;

  return (
    <section className={styles.sideCard}>
      <div className={styles.completionTop}>
        <div>
          <h2>今日已完成</h2>
          <strong>
            {completed}<span> / {total || 0}</span>
          </strong>
          <p>{completed >= total && total > 0 ? '今日任务已完成，记得领奖。' : '继续加油，完成更多任务吧。'}</p>
        </div>
        <div className={styles.progressCircle} style={circleStyle}>
          <span>{percent}%</span>
        </div>
      </div>
      <div className={styles.todayStats}>
        <span>已领取奖励</span>
        <strong>{completed} 项</strong>
        <span>获得钻石</span>
        <strong>+{completed * 10}</strong>
        <span>获得成长值</span>
        <strong>+{completed * 15} EXP</strong>
      </div>
    </section>
  );
}

function RewardInfoCard() {
  return (
    <section className={styles.sideCard}>
      <header className={styles.sideHeader}>
        <Icon name="package" size={16} />
        <div>
          <h2>奖励说明</h2>
          <p>完成任务可获得以下奖励</p>
        </div>
      </header>
      <div className={styles.rewardInfoList}>
        <div>
          <span className={styles.rewardIcon}>◇</span>
          <div>
            <strong>钻石</strong>
            <p>可用于兑换稀有道具</p>
          </div>
        </div>
        <div>
          <span className={styles.rewardIcon}>EXP</span>
          <div>
            <strong>成长值</strong>
            <p>提升等级，解锁更多权限</p>
          </div>
        </div>
      </div>
      <Link href="/points" className={styles.textLink}>
        查看钻石明细 <Icon name="arrow-right" size={13} />
      </Link>
    </section>
  );
}

function makeStats(dailyTasks: TaskDisplayItem[], growthTasks: TaskDisplayItem[]) {
  const allTasks = [...dailyTasks, ...growthTasks];
  return {
    total: allTasks.length,
    completed: allTasks.filter((task) => task.completed).length,
    dailyTotal: dailyTasks.length,
    dailyCompleted: dailyTasks.filter((task) => task.completed).length,
    growthTotal: growthTasks.length,
    growthCompleted: growthTasks.filter((task) => task.completed).length,
    rewardPoints: allTasks.reduce((sum, task) => sum + task.rewardPoints, 0),
    rewardExp: allTasks.reduce((sum, task) => sum + task.rewardExp, 0)
  };
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function taskHref(task: TaskDisplayItem) {
  const text = `${task.slug} ${task.title} ${task.description}`.toLowerCase();
  if (text.includes('post') || text.includes('发帖') || text.includes('发 1')) return '/editor';
  if (text.includes('vote') || text.includes('投票')) return '/';
  if (text.includes('purchase') || text.includes('购物') || text.includes('交易')) return '/market';
  if (text.includes('comment') || text.includes('评论')) return '/';
  return '/';
}
