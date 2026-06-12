'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import { timeAgo } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



interface Contest {
  id: string;
  title: string;
  description: string;
  cover: string | null;
  theme: string | null;
  status: string;
  startAt: string;
  endAt: string;
  votingStartAt: string | null;
  votingEndAt: string | null;
  entryCount: number;
  participantCount: number;
  voteCount: number;
  viewCount: number;
  featured: boolean;
  creator: {
    id: string;
    name: string;
    avatar: string;
  };
  _count: {
    entries: number;
  };
}

const statusMap: Record<string, {label: string;color: string;}> = {
  draft: { label: '草稿', color: styles.r_66a36c90 },
  upcoming: { label: '即将开始', color: styles.r_4c3a8aac },
  active: { label: '进行中', color: styles.r_b0a7deb5 },
  voting: { label: '投票中', color: styles.r_46d77812 },
  ended: { label: '已结束', color: styles.r_7b89cd85 },
  cancelled: { label: '已取消', color: styles.r_421d4581 }
};

export default function ContestsPage() {
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('active');

  useEffect(() => {
    loadContests(activeTab);
  }, [activeTab]);

  const loadContests = async (status: string) => {
    setLoading(true);
    try {
      const data = await api.get<{
        items: Contest[];
      }>(`/api/contests?status=${status}&limit=50`);
      setContests(data.items);
    } catch (error) {
      console.error("加载大赛失败:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className={cx(styles.r_1d4402df, styles.r_0e12dc7d)}>
        {/* 头部 */}
        <div className={styles.r_b6777c6d}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>🏆 摄影大赛</h1>
          <p className={cx(styles.r_fc7473ca, styles.r_7b89cd85)}>展示你的多肉植物摄影作品，赢取丰厚奖品</p>
        </div>

        {/* 标签页 */}
        <div className={cx(styles.r_60fbb771, styles.r_77a2a20e, styles.r_b6777c6d, styles.r_65fdbade, styles.r_691861bc)}>
          {[
          { key: 'active', label: '进行中' },
          { key: 'voting', label: '投票中' },
          { key: 'upcoming', label: '即将开始' },
          { key: 'ended', label: '已结束' },
          { key: 'all', label: '全部' }].
          map((tab) =>
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cx(styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_2689f395, styles.r_ceb69a6b, `${
            activeTab === tab.key ? cx(styles.r_b17d6a13, styles.r_65ac0c49, styles.r_3bd65fe8) : cx(styles.r_7b89cd85, styles.r_3364420b)}`)


            }>

              {tab.label}
            </button>
          )}
        </div>

        {/* 大赛列表 */}
        {loading ?
        <div className={cx(styles.r_f3c543ad, styles.r_0d304f90, styles.r_e4d6f343)}>
            {Array.from({ length: 4 }).map((_, i) =>
          <div key={i} className={styles.r_d59b9794}>
                <div className={cx(styles.r_826c9471, styles.r_f2b23104, styles.r_1301e5c1)} />
                <div className={cx(styles.r_0478c89a, styles.r_6ed543e2)}>
                  <div className={cx(styles.r_f6fe9024, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_11e59c6d, styles.r_6da6a3c3, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_11e59c6d, styles.r_f09b0bba, styles.r_07389a77, styles.r_f2b23104)} />
                </div>
              </div>
          )}
          </div> :
        contests.length === 0 ?
        <div className={cx(styles.r_02cafd38, styles.r_ca6bf630)}>
            <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>🏆</div>
            <div className={cx(styles.r_42536e69, styles.r_2689f395, styles.r_399e11a5, styles.r_a77ed4d9)}>暂无大赛</div>
            <p className={cx(styles.r_fc7473ca, styles.r_7b89cd85)}>敬请期待精彩的摄影大赛</p>
          </div> :

        <div className={cx(styles.r_f3c543ad, styles.r_0d304f90, styles.r_e4d6f343)}>
            {contests.map((contest) =>
          <ContestCard key={contest.id} contest={contest} />
          )}
          </div>
        }
      </div>
    </Shell>);

}

function ContestCard({ contest }: {contest: Contest;}) {
  const statusInfo = statusMap[contest.status] || statusMap.draft;

  return (
    <Link
      href={`/contests/${contest.id}`}
      className={cx(styles.r_64292b1c, styles.r_2cd02d11)}>

      {/* 封面 */}
      <div className={cx(styles.r_d89972fe, styles.r_826c9471, styles.r_39b2e003, styles.r_d63b4163, styles.r_280245bf)}>
        {contest.cover ?
        <Image
          src={contest.cover}
          alt={contest.title}
          fill
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
          unoptimized /> :


        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_668b21aa, styles.r_0f9d5597)}>
            🏆
          </div>
        }
        {/* 状态标签 */}
        <div className={cx(styles.r_da4dbfbc, styles.r_8782d84c, styles.r_c100b64c, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_ac204c10, styles.r_359090c2, styles.r_2689f395, styles.r_6c21de57, styles.r_1ca6dd1e, `${statusInfo.color}`)}>
          {statusInfo.label}
        </div>
        {contest.featured &&
        <div className={cx(styles.r_da4dbfbc, styles.r_8782d84c, styles.r_22e59b72, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_ac204c10, styles.r_359090c2, styles.r_2689f395, styles.r_d0adf729, styles.r_72a4c7cd)}>
            精选
          </div>
        }
      </div>

      {/* 内容 */}
      <div className={styles.r_0478c89a}>
        <h3 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9, styles.r_f50e2015)}>
          {contest.title}
        </h3>
        <p className={cx(styles.r_fc7473ca, styles.r_02eb621e, styles.r_da019856, styles.r_054cb4e3)}>
          {contest.description}
        </p>

        {/* 统计 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_359090c2, styles.r_7b89cd85, styles.r_da019856)}>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="image" size={14} />
            {contest._count.entries} 作品
          </span>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="heart" size={14} />
            {contest.voteCount} 票
          </span>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="eye" size={14} />
            {contest.viewCount}
          </span>
        </div>

        {/* 时间 */}
        <div className={cx(styles.r_359090c2, styles.r_66a36c90)}>
          {contest.status === 'active' &&
          <span>截止时间：{new Date(contest.endAt).toLocaleDateString()}</span>
          }
          {contest.status === 'voting' && contest.votingEndAt &&
          <span>投票截止：{new Date(contest.votingEndAt).toLocaleDateString()}</span>
          }
          {contest.status === 'upcoming' &&
          <span>开始时间：{new Date(contest.startAt).toLocaleDateString()}</span>
          }
          {contest.status === 'ended' &&
          <span>已于 {new Date(contest.endAt).toLocaleDateString()} 结束</span>
          }
        </div>
      </div>
    </Link>);

}