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
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { SkinPreview } from '@/components/skin/SkinCard';
import type { SkinItem, TaskItem, User } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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

  const [activity, setActivity] = useState<{score: number;rank: number | null;total: number;}>({
    score: 0,
    rank: null,
    total: 0
  });
  const [rewards, setRewards] = useState<ActivityRewardFromAPI[]>([]);
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [t, a, rw, rk] = await Promise.all([
      user ?
      api.get<typeof tasks>('/api/tasks').catch(() => ({
        daily: [],
        monthly: [],
        achievement: []
      })) :
      Promise.resolve({ daily: [], monthly: [], achievement: [] }),
      user ?
      api.get<{score: number;rank: number | null;totalParticipants: number;}>(
        '/api/activity/me'
      ) :
      Promise.resolve({ score: 0, rank: null, totalParticipants: 0 }),
      api.get<{items: ActivityRewardFromAPI[];}>('/api/activity/rewards'),
      api.get<{items: RankingRow[];}>('/api/activity/ranking?limit=50')]
      );
      setTasks(t);
      setActivity({
        score: a.score,
        rank: a.rank,
        total: 'totalParticipants' in a ? a.totalParticipants : 0
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
      const r = await api.post<{rewardPoints: number;rewardActivity: number;}>(
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
      const r = await api.post<{rewardPoints: number;rewardSkinId: string | null;}>(
        `/api/activity/rewards/${reward.id}/claim`
      );
      toast.success(
        t('tasks.rewardClaimed', {
          points: r.rewardPoints,
          skin: r.rewardSkinId ? t('tasks.rewardClaimedSkin') : ''
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
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>🏆</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>{t('tasks.loginRequired')}</div>
          <Link href="/login?redirect=/tasks" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>{t('nav.login')}</Link>
        </div>
      </Shell>);

  }

  return (
    <Shell>
      {/* 月度活跃度概览 */}
      <div className={cx(styles.r_b6777c6d, styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_8074f1c1)}>
        <div className={styles.r_2cd02d11}>
          <div className={cx(styles.r_39b2e003, styles.r_0859a5d5, styles.r_bd67cf78, styles.r_de32bcb5, styles.r_c07e54fd, styles.r_72a4c7cd)}>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_b7012bb2, styles.r_0c3bc985)}>
              <div>
                <div className={cx(styles.r_359090c2, styles.r_714816ef)}>{t('tasks.monthly.title')}</div>
                <div className={cx(styles.r_b6b02c0e, styles.r_a95699d9, styles.r_69450ef1)}>{activity.score}</div>
              </div>
              <div>
                <div className={cx(styles.r_359090c2, styles.r_714816ef)}>{t('tasks.monthly.ranking')}</div>
                <div className={cx(styles.r_b6b02c0e, styles.r_3febee09, styles.r_e83a7042)}>
                  {activity.rank ? `#${activity.rank}` : '—'}
                  <span className={cx(styles.r_f58b0257, styles.r_359090c2, styles.r_0c67ca47)}>/ {activity.total}</span>
                </div>
              </div>
              {vip.isVip &&
              <span className={cx(styles.r_fb56d9cf, styles.r_ac204c10, styles.r_a25e135b, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_69450ef1, styles.r_67e74965)}>
                  {t('tasks.monthly.vipBoost')}
                </span>
              }
            </div>
            <div className={cx(styles.r_eccd13ef, styles.r_d058ca6d, styles.r_714816ef)}>
              {t('tasks.monthly.desc')}
            </div>
          </div>
        </div>

        <div className={styles.r_8e63407b}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{t('tasks.howto.title')}</div>
          <ul className={cx(styles.r_50d0d216, styles.r_da7c36cd, styles.r_359090c2, styles.r_21d33c50)}>
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
      <div className={cx(styles.r_fb88ccaa, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_65fdbade, styles.r_88b684d2)}>
        {
        [
        { key: 'tasks' as Tab, labelKey: 'tasks.tabs.tasks' },
        { key: 'rewards' as Tab, labelKey: 'tasks.tabs.rewards' },
        { key: 'ranking' as Tab, labelKey: 'tasks.tabs.ranking' }].

        map((item) =>
        <button
          key={item.key}
          onClick={() => setTab(item.key)}
          className={cn(cx(styles.r_d89972fe, styles.r_f0faeb26, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_ceb69a6b),

          tab === item.key ? cx(styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)


          )}>

            {t(item.labelKey)}
            {tab === item.key &&
          <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
          }
          </button>
        )}
      </div>

      {loading ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div> :
      tab === 'tasks' ?
      <div className={styles.r_b3542e05}>
          <TaskGroup
          title={t('tasks.sections.dailyTitle')}
          subtitle={t('tasks.sections.dailySubtitle')}
          tasks={tasks.daily}
          busyId={busyId}
          onClaim={claimTask} />

          <TaskGroup
          title={t('tasks.sections.monthlyTitle')}
          subtitle={t('tasks.sections.monthlySubtitle')}
          tasks={tasks.monthly}
          busyId={busyId}
          onClaim={claimTask} />

          <TaskGroup
          title={t('tasks.sections.achievementTitle')}
          subtitle={t('tasks.sections.achievementSubtitle')}
          tasks={tasks.achievement}
          busyId={busyId}
          onClaim={claimTask} />

        </div> :
      tab === 'rewards' ?
      <RewardsPanel
        rewards={rewards}
        myScore={activity.score}
        busyId={busyId}
        onClaim={claimReward} /> :


      <Ranking ranking={ranking} myUserId={user?.id} />
      }
    </Shell>);

}

function TaskGroup({
  title,
  subtitle,
  tasks,
  busyId,
  onClaim






}: {title: string;subtitle: string;tasks: TaskItem[];busyId: string | null;onClaim: (t: TaskItem) => void;}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div>
          <h3 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{title}</h3>
          <div className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>{subtitle}</div>
        </div>
        <div className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
          已完成 {tasks.filter((t) => t.completed).length} / {tasks.length}
        </div>
      </div>
      <ul className={styles.r_6f7e013d}>
        {tasks.map((t) => {
          const percent = Math.min(100, Math.round(t.progress / t.target * 100));
          return (
            <li key={t.id} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_8e63407b)}>
              <div className={cx(styles.r_f3c543ad, styles.r_508ebf85, styles.r_e7e37107, styles.r_012fbd12, styles.r_67d66567, styles.r_a217b4ea, styles.r_7ebecbb6, styles.r_3febee09)}>
                {t.icon}
              </div>
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_77a2a20e)}>
                  <span className={cx(styles.r_fc7473ca, styles.r_2689f395)}>{t.title}</span>
                  {t.completed &&
                  <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_45d82811, styles.r_c6e52cdb, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                      ✓ 已完成
                    </span>
                  }
                </div>
                <div className={cx(styles.r_15e1b1f4, styles.r_f50e2015, styles.r_359090c2, styles.r_69335b95)}>{t.description}</div>
                <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <div className={cx(styles.r_095acb27, styles.r_36e579c0, styles.r_2cd02d11, styles.r_ac204c10, styles.r_f2b23104)}>
                    <div
                      className={cn(cx(styles.r_668b21aa, styles.r_ac204c10, styles.r_0fe7d7d8),

                      t.completed ? styles.r_45499621 : styles.r_8b65c498
                      )}
                      style={{ width: `${percent}%` }} />

                  </div>
                  <span className={cx(styles.r_012fbd12, styles.r_d058ca6d, styles.r_69335b95)}>
                    {t.progress}/{t.target}
                  </span>
                </div>
              </div>
              <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_6f27f4f7, styles.r_44ee8ba0)}>
                <div className={cx(styles.r_1dc571a3, styles.r_69335b95)}>奖励</div>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_359090c2)}>
                  {t.rewardPoints > 0 &&
                  <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_d8e0e382, styles.r_b54428d1)}>+{t.rewardPoints}💎</span>
                  }
                  {t.rewardActivity > 0 &&
                  <span className={cx(styles.r_07389a77, styles.r_3b5cf6c0, styles.r_d8e0e382, styles.r_06fd2bc1)}>+{t.rewardActivity}活</span>
                  }
                  {t.rewardExp > 0 &&
                  <span className={cx(styles.r_07389a77, styles.r_7ebecbb6, styles.r_d8e0e382, styles.r_5f6a59f1)}>+{t.rewardExp}EXP</span>
                  }
                </div>
                {t.completed && !t.claimed ?
                <button
                  type="button"
                  onClick={() => onClaim(t)}
                  disabled={busyId === t.id}
                  className={cx(styles.r_23b4e5ed, styles.r_ebb407e8, styles.r_dd702538)}>

                    领取
                  </button> :
                t.claimed ?
                <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>已领取</span> :

                <span className={cx(styles.r_1dc571a3, styles.r_6c4cc49e)}>进行中</span>
                }
              </div>
            </li>);

        })}
      </ul>
    </section>);

}

function RewardsPanel({
  rewards,
  myScore,
  busyId,
  onClaim





}: {rewards: ActivityRewardFromAPI[];myScore: number;busyId: string | null;onClaim: (r: ActivityRewardFromAPI) => void;}) {
  if (rewards.length === 0) return <Empty icon="🎁" title="暂无活跃度奖励" />;
  const max = rewards[rewards.length - 1].threshold;
  const overall = Math.min(100, myScore / max * 100);

  return (
    <div>
      <div className={cx(styles.r_da019856, styles.r_8e63407b)}>
        <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_b7012bb2, styles.r_8ef2268e, styles.r_359090c2)}>
          <span className={styles.r_69335b95}>本月进度</span>
          <span className={cx(styles.r_399e11a5, styles.r_e83a7042)}>{myScore} / {max}</span>
        </div>
        <div className={cx(styles.r_2f2a842e, styles.r_2cd02d11, styles.r_ac204c10, styles.r_f2b23104)}>
          <div
            className={cx(styles.r_668b21aa, styles.r_6ae7db2c, styles.r_78ce000e, styles.r_6307c852, styles.r_70203aca)}
            style={{ width: `${overall}%` }} />

        </div>
        <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_6c4cc49e)}>
          {rewards.map((r) =>
          <span key={r.id}>{r.threshold}</span>
          )}
        </div>
      </div>

      <ul className={styles.r_6f7e013d}>
        {rewards.map((r) => {
          const reached = myScore >= r.threshold;
          return (
            <li key={r.id} className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_8e63407b), !reached && styles.r_0c67ca47)}>
              <div className={cx(styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_012fbd12, styles.r_67d66567, styles.r_a217b4ea, styles.r_39b2e003, styles.r_49a47a82, styles.r_f62af50e)}>
                {r.rewardSkin ? <SkinPreview skin={r.rewardSkin} size="sm" /> : <span className={styles.r_3febee09}>🎁</span>}
              </div>
              <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_77a2a20e)}>
                  <span className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{r.title}</span>
                  <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
                    需要活跃度 {r.threshold}
                  </span>
                </div>
                <div className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_359090c2, styles.r_69335b95)}>{r.description}</div>
                <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_d058ca6d)}>
                  <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_45d82811, styles.r_b54428d1)}>+{r.rewardPoints}💎</span>
                  {r.rewardSkin &&
                  <span className={cx(styles.r_07389a77, styles.r_3b5cf6c0, styles.r_45d82811, styles.r_06fd2bc1)}>
                      皮肤「{r.rewardSkin.name}」
                    </span>
                  }
                </div>
              </div>
              {r.claimedThisMonth ?
              <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>本月已领</span> :
              reached ?
              <button
                type="button"
                disabled={busyId === r.id}
                onClick={() => onClaim(r)}
                className={styles.r_dd702538}>

                  领取
                </button> :

              <span className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>未达到</span>
              }
            </li>);

        })}
      </ul>
    </div>);

}

function Ranking({
  ranking,
  myUserId



}: {ranking: RankingRow[];myUserId?: string;}) {
  if (ranking.length === 0) return <Empty icon="🏆" title="本月还没有数据" desc="发帖、评论、签到都会上榜" />;
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className={styles.r_3e7ce58d}>
      {/* TOP 3 */}
      {top3.length > 0 &&
      <div className={cx(styles.r_f3c543ad, styles.r_be2e831b, styles.r_77a2a20e, styles.r_15121b08)}>
          {top3.map((r) => {
          const podiumClass =
          r.rank === 1 ? cx(styles.r_ef72121a, styles.r_96b881c8, styles.r_a3c287d9) :

          r.rank === 2 ? cx(styles.r_ea37b42b, styles.r_50f960a5, styles.r_6d112f9a) : cx(styles.r_6ca7ddb0, styles.r_b0653f25, styles.r_19e980a1);


          return (
            <div
              key={r.user.id}
              className={cn(cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_68f2db62, styles.r_39b2e003, styles.r_8e63407b),

              podiumClass
              )}>

                <div className={styles.r_3febee09}>{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : '🥉'}</div>
                <Avatar src={r.user.avatar} alt={r.user.name} size={48} ring />
                <UserName user={r.user} className={styles.r_50d0d216} size="sm" />
                <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_e83a7042, styles.r_399e11a5)}>{r.score} 活跃度</div>
              </div>);

        })}
        </div>
      }

      <ul className={cx(styles.r_fa6acbf8, styles.r_6f8e581a)}>
        {rest.map((r) =>
        <li
          key={r.user.id}
          className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_d139dd09, styles.r_1b2d54a3),

          r.user.id === myUserId && styles.r_9ac94195
          )}>

            <span className={cx(styles.r_7ec10f86, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_e83a7042, styles.r_5f6a59f1)}>{r.rank}</span>
            <Avatar src={r.user.avatar} alt={r.user.name} size={32} />
            <UserName user={r.user} size="sm" />
            <span className={cx(styles.r_fb56d9cf, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{r.score}</span>
          </li>
        )}
      </ul>
    </div>);

}