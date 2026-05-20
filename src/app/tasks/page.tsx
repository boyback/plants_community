'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { UserName } from '@/components/ui/UserName';
import { Empty } from '@/components/ui/Empty';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { SkinPreview } from '@/components/skin/SkinCard';
import type { SkinItem, TaskItem, User } from '@/lib/types';

type Tab = 'tasks' | 'rewards' | 'ranking';

interface ActivityRewardFromAPI {
  id: string;
  threshold: number;
  title: string;
  description: string;
  rewardPoints: number;
  rewardSkin: SkinItem | null;
  claimedThisMonth: boolean;
  reached: boolean;
}

interface RankingRow {
  rank: number;
  user: User;
  score: number;
}

export default function TasksPage() {
  const { user, loading: authLoading, vip, refresh } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('tasks');

  const [tasks, setTasks] = useState<{
    daily: TaskItem[];
    monthly: TaskItem[];
    achievement: TaskItem[];
  }>({ daily: [], monthly: [], achievement: [] });

  const [activity, setActivity] = useState<{ score: number; rank: number | null; total: number }>({
    score: 0,
    rank: null,
    total: 0,
  });
  const [rewards, setRewards] = useState<ActivityRewardFromAPI[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, a, rw, rk] = await Promise.all([
        user
          ? api.get<typeof tasks>('/api/tasks').catch(() => ({
              daily: [],
              monthly: [],
              achievement: [],
            }))
          : Promise.resolve({ daily: [], monthly: [], achievement: [] }),
        user
          ? api.get<{ score: number; rank: number | null; totalParticipants: number }>(
              '/api/activity/me'
            )
          : Promise.resolve({ score: 0, rank: null, totalParticipants: 0 }),
        api.get<{ items: ActivityRewardFromAPI[] }>('/api/activity/rewards'),
        api.get<{ items: RankingRow[] }>('/api/activity/ranking?limit=50'),
      ]);
      setTasks(t);
      setActivity({
        score: a.score,
        rank: a.rank,
        total: 'totalParticipants' in a ? a.totalParticipants : 0,
      });
      setRewards(rw.items);
      setRanking(rk.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const claimTask = async (task: TaskItem) => {
    setBusyId(task.id);
    try {
      const r = await api.post<{ rewardPoints: number; rewardActivity: number }>(
        '/api/tasks/claim',
        { taskId: task.id }
      );
      toast.success(t('tasks.claimedToast', { points: r.rewardPoints, activity: r.rewardActivity }));
      load();
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('tasks.claimFail'));
    } finally {
      setBusyId(null);
    }
  };

  const claimReward = async (reward: ActivityRewardFromAPI) => {
    setBusyId(reward.id);
    try {
      const r = await api.post<{ rewardPoints: number; rewardSkinId: string | null }>(
        `/api/activity/rewards/${reward.id}/claim`
      );
      toast.success(
        t('tasks.rewardClaimed', {
          points: r.rewardPoints,
          skin: r.rewardSkinId ? t('tasks.rewardClaimedSkin') : '',
        })
      );
      load();
      refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('tasks.claimFail'));
    } finally {
      setBusyId(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🏆</div>
          <div className="mt-3 text-lg font-semibold">{t('tasks.loginRequired')}</div>
          <Link href="/login?redirect=/tasks" className="btn-primary mt-4 inline-flex">{t('nav.login')}</Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* 月度活跃度概览 */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-700 p-5 text-white">
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                <div className="text-xs opacity-80">{t('tasks.monthly.title')}</div>
                <div className="mt-1 text-4xl font-bold">{activity.score}</div>
              </div>
              <div>
                <div className="text-xs opacity-80">{t('tasks.monthly.ranking')}</div>
                <div className="mt-1 text-2xl font-semibold">
                  {activity.rank ? `#${activity.rank}` : '—'}
                  <span className="ml-1 text-xs opacity-70">/ {activity.total}</span>
                </div>
              </div>
              {vip.isVip && (
                <span className="ml-auto rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  {t('tasks.monthly.vipBoost')}
                </span>
              )}
            </div>
            <div className="mt-3 text-[11px] opacity-80">
              {t('tasks.monthly.desc')}
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="text-sm font-semibold">{t('tasks.howto.title')}</div>
          <ul className="mt-2 space-y-1 text-xs text-leaf-700/80">
            <li>{t('tasks.howto.items.signin')}</li>
            <li>{t('tasks.howto.items.post')}</li>
            <li>{t('tasks.howto.items.comment')}</li>
            <li>{t('tasks.howto.items.vote')}</li>
            <li>{t('tasks.howto.items.purchase')}</li>
            <li>{t('tasks.howto.items.taskBonus')}</li>
          </ul>
        </div>
      </div>

      {/* Tab */}
      <div className="mb-5 flex items-center gap-1 border-b border-leaf-100">
        {(
          [
            { key: 'tasks' as Tab, labelKey: 'tasks.tabs.tasks' },
            { key: 'rewards' as Tab, labelKey: 'tasks.tabs.rewards' },
            { key: 'ranking' as Tab, labelKey: 'tasks.tabs.ranking' },
          ]
        ).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm transition-colors',
              tab === item.key
                ? 'text-leaf-700 font-medium'
                : 'text-ink-700/60 hover:text-leaf-700'
            )}
          >
            {t(item.labelKey)}
            {tab === item.key && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-leaf-500" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      ) : tab === 'tasks' ? (
        <div className="space-y-6">
          <TaskGroup
            title={t('tasks.sections.dailyTitle')}
            subtitle={t('tasks.sections.dailySubtitle')}
            tasks={tasks.daily}
            busyId={busyId}
            onClaim={claimTask}
          />
          <TaskGroup
            title={t('tasks.sections.monthlyTitle')}
            subtitle={t('tasks.sections.monthlySubtitle')}
            tasks={tasks.monthly}
            busyId={busyId}
            onClaim={claimTask}
          />
          <TaskGroup
            title={t('tasks.sections.achievementTitle')}
            subtitle={t('tasks.sections.achievementSubtitle')}
            tasks={tasks.achievement}
            busyId={busyId}
            onClaim={claimTask}
          />
        </div>
      ) : tab === 'rewards' ? (
        <RewardsPanel
          rewards={rewards}
          myScore={activity.score}
          busyId={busyId}
          onClaim={claimReward}
        />
      ) : (
        <Ranking ranking={ranking} myUserId={user?.id} />
      )}
    </Shell>
  );
}

function TaskGroup({
  title,
  subtitle,
  tasks,
  busyId,
  onClaim,
}: {
  title: string;
  subtitle: string;
  tasks: TaskItem[];
  busyId: string | null;
  onClaim: (t: TaskItem) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-ink-800">{title}</h3>
          <div className="text-[11px] text-leaf-700/60">{subtitle}</div>
        </div>
        <div className="text-[11px] text-leaf-700/60">
          已完成 {tasks.filter((t) => t.completed).length} / {tasks.length}
        </div>
      </div>
      <ul className="space-y-2">
        {tasks.map((t) => {
          const percent = Math.min(100, Math.round((t.progress / t.target) * 100));
          return (
            <li key={t.id} className="card flex items-center gap-3 p-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-leaf-50 text-2xl">
                {t.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{t.title}</span>
                  {t.completed && (
                    <span className="rounded-full bg-leaf-100 px-1.5 py-px text-[10px] text-leaf-700">
                      ✓ 已完成
                    </span>
                  )}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-leaf-700/70">{t.description}</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-leaf-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        t.completed ? 'bg-leaf-500' : 'bg-leaf-300'
                      )}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] text-leaf-700/70">
                    {t.progress}/{t.target}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-[10px] text-leaf-700/70">奖励</div>
                <div className="flex items-center gap-1 text-xs">
                  {t.rewardPoints > 0 && (
                    <span className="rounded bg-rose-50 px-1 text-rose-700">+{t.rewardPoints}💎</span>
                  )}
                  {t.rewardActivity > 0 && (
                    <span className="rounded bg-violet-50 px-1 text-violet-700">+{t.rewardActivity}活</span>
                  )}
                  {t.rewardExp > 0 && (
                    <span className="rounded bg-leaf-50 px-1 text-leaf-700">+{t.rewardExp}EXP</span>
                  )}
                </div>
                {t.completed && !t.claimed ? (
                  <button
                    type="button"
                    onClick={() => onClaim(t)}
                    disabled={busyId === t.id}
                    className="btn-primary !px-3 !py-1 !text-xs"
                  >
                    领取
                  </button>
                ) : t.claimed ? (
                  <span className="text-[10px] text-leaf-700/60">已领取</span>
                ) : (
                  <span className="text-[10px] text-leaf-700/60">进行中</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RewardsPanel({
  rewards,
  myScore,
  busyId,
  onClaim,
}: {
  rewards: ActivityRewardFromAPI[];
  myScore: number;
  busyId: string | null;
  onClaim: (r: ActivityRewardFromAPI) => void;
}) {
  if (rewards.length === 0) return <Empty icon="🎁" title="暂无活跃度奖励" />;
  const max = rewards[rewards.length - 1].threshold;
  const overall = Math.min(100, (myScore / max) * 100);

  return (
    <div>
      <div className="mb-4 card p-4">
        <div className="mb-2 flex items-baseline justify-between text-xs">
          <span className="text-leaf-700/70">本月进度</span>
          <span className="text-ink-800 font-semibold">{myScore} / {max}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-leaf-100">
          <div
            className="h-full bg-gradient-to-r from-leaf-400 via-leaf-500 to-leaf-700"
            style={{ width: `${overall}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-leaf-700/60">
          {rewards.map((r) => (
            <span key={r.id}>{r.threshold}</span>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {rewards.map((r) => {
          const reached = myScore >= r.threshold;
          return (
            <li key={r.id} className={cn('card flex items-center gap-4 p-4', !reached && 'opacity-70')}>
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-leaf-50 to-violet-50">
                {r.rewardSkin ? <SkinPreview skin={r.rewardSkin} size="sm" /> : <span className="text-2xl">🎁</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="text-[11px] text-leaf-700/60">
                    需要活跃度 {r.threshold}
                  </span>
                </div>
                <div className="mt-0.5 line-clamp-2 text-xs text-leaf-700/70">{r.description}</div>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                  <span className="rounded bg-rose-50 px-1.5 text-rose-700">+{r.rewardPoints}💎</span>
                  {r.rewardSkin && (
                    <span className="rounded bg-violet-50 px-1.5 text-violet-700">
                      皮肤「{r.rewardSkin.name}」
                    </span>
                  )}
                </div>
              </div>
              {r.claimedThisMonth ? (
                <span className="text-[11px] text-leaf-700/60">本月已领</span>
              ) : reached ? (
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => onClaim(r)}
                  className="btn-primary !text-xs"
                >
                  领取
                </button>
              ) : (
                <span className="text-[11px] text-leaf-700/60">未达到</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Ranking({
  ranking,
  myUserId,
}: {
  ranking: RankingRow[];
  myUserId?: string;
}) {
  if (ranking.length === 0) return <Empty icon="🏆" title="本月还没有数据" desc="发帖、评论、签到都会上榜" />;
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-4">
      {/* TOP 3 */}
      {top3.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          {top3.map((r) => {
            const podiumClass =
              r.rank === 1
                ? 'order-2 from-amber-300 to-amber-100'
                : r.rank === 2
                ? 'order-1 from-leaf-200 to-leaf-50'
                : 'order-3 from-rose-200 to-rose-50';
            return (
              <div
                key={r.user.id}
                className={cn(
                  'flex flex-col items-center rounded-2xl bg-gradient-to-br p-4',
                  podiumClass
                )}
              >
                <div className="text-2xl">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</div>
                <Avatar src={r.user.avatar} alt={r.user.name} size={48} ring />
                <UserName user={r.user} className="mt-2" size="sm" />
                <div className="mt-1 text-xs font-semibold text-ink-800">{r.score} 活跃度</div>
              </div>
            );
          })}
        </div>
      )}

      <ul className="card divide-y divide-leaf-50">
        {rest.map((r) => (
          <li
            key={r.user.id}
            className={cn(
              'flex items-center gap-3 px-5 py-3',
              r.user.id === myUserId && 'bg-leaf-50/50'
            )}
          >
            <span className="w-6 text-center text-sm font-semibold text-leaf-700">{r.rank}</span>
            <Avatar src={r.user.avatar} alt={r.user.name} size={32} />
            <UserName user={r.user} size="sm" />
            <span className="ml-auto text-sm font-semibold text-ink-800">{r.score}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
