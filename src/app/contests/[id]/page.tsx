'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



interface Contest {
  id: string;
  title: string;
  description: string;
  cover: string | null;
  theme: string | null;
  rules: string;
  prizes: string;
  status: string;
  startAt: string;
  endAt: string;
  votingStartAt: string | null;
  votingEndAt: string | null;
  entryCount: number;
  voteCount: number;
  viewCount: number;
  maxEntriesPerUser: number;
  allowVoting: boolean;
  allowComments: boolean;
  creator: {
    id: string;
    name: string;
    avatar: string;
  };
}

interface Entry {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  images: string;
  voteCount: number;
  viewCount: number;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  species: {
    id: string;
    name: string;
    latinName: string;
  } | null;
  _count: {
    votes: number;
    comments: number;
  };
}

export default function ContestDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [contest, setContest] = useState<Contest | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest');

  useEffect(() => {
    if (params.id) {
      loadContest();
      loadEntries();
    }
  }, [params.id, sortBy]);

  const loadContest = async () => {
    try {
      const data = await api.get<Contest>(`/api/contests/${params.id}`);
      setContest(data);
    } catch (error) {
      console.error("加载大赛失败:", error);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await api.get<{items: Entry[];}>(
        `/api/contests/${params.id}/entries?sort=${sortBy}&limit=100`
      );
      setEntries(data.items);
    } catch (error) {
      console.error("加载作品失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (entryId: string) => {
    if (!user) {
      toast.error('请先登录');
      return;
    }

    try {
      await api.post(`/api/contests/entries/${entryId}/vote`, {
        userId: user.id
      });
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || '投票失败');
    }
  };

  if (!contest) {
    return (
      <Shell>
        <div className={cx(styles.r_1d4402df, styles.r_0e12dc7d, styles.r_02cafd38, styles.r_ca6bf630)}>
          <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>🏆</div>
          <div className={cx(styles.r_42536e69, styles.r_2689f395, styles.r_399e11a5)}>加载中...</div>
        </div>
      </Shell>);

  }

  const rules = JSON.parse(contest.rules || "[]");
  const prizes = JSON.parse(contest.prizes || "[]");

  return (
    <Shell>
      <div className={cx(styles.r_1d4402df, styles.r_0e12dc7d)}>
        {/* 大赛头部 */}
        <div className={styles.r_b6777c6d}>
          {contest.cover &&
          <div className={cx(styles.r_d89972fe, styles.r_25245f7e, styles.r_1301e5c1, styles.r_2cd02d11)}>
              <Image
              src={contest.cover}
              alt={contest.title}
              fill
              className={styles.r_7d85d0c2}
              unoptimized />

            </div>
          }
          <div className={styles.r_0478c89a}>
            <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_da019856)}>
              <div className={styles.r_36e579c0}>
                <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>
                  {contest.title}
                </h1>
                <p className={cx(styles.r_02eb621e, styles.r_da019856)}>{contest.description}</p>
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_fc7473ca, styles.r_7b89cd85)}>
                  <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                    <Icon name="image" size={16} />
                    {contest.entryCount} 作品
                  </span>
                  <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                    <Icon name="heart" size={16} />
                    {contest.voteCount} 票
                  </span>
                  <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                    <Icon name="eye" size={16} />
                    {contest.viewCount} 浏览
                  </span>
                </div>
              </div>
              {contest.status === 'active' && user &&
              <Link
                href={`/contests/${contest.id}/submit`}
                className="btn-primary">

                  提交作品
                </Link>
              }
            </div>

            {/* 规则和奖品 */}
            <div className={cx(styles.r_f3c543ad, styles.r_e4d6f343, styles.r_0d304f90, styles.r_31f25533, styles.r_30c1d058, styles.r_b950dda2, styles.r_691861bc)}>
              {rules.length > 0 &&
              <div>
                  <h3 className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>📋 参赛规则</h3>
                  <ul className={cx(styles.r_fc7473ca, styles.r_02eb621e, styles.r_da7c36cd)}>
                    {rules.map((rule: string, i: number) =>
                  <li key={i}>• {rule}</li>
                  )}
                  </ul>
                </div>
              }
              {prizes.length > 0 &&
              <div>
                  <h3 className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>🎁 奖品设置</h3>
                  <ul className={cx(styles.r_fc7473ca, styles.r_02eb621e, styles.r_da7c36cd)}>
                    {prizes.map((prize: string, i: number) =>
                  <li key={i}>• {prize}</li>
                  )}
                  </ul>
                </div>
              }
            </div>
          </div>
        </div>

        {/* 排序 */}
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_da019856)}>
          <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_399e11a5)}>参赛作品</h2>
          <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
            {[
            { key: 'latest', label: '最新' },
            { key: 'popular', label: '最热' }].
            map((sort) =>
            <button
              key={sort.key}
              onClick={() => setSortBy(sort.key)}
              className={cx(styles.r_0e17f2bd, styles.r_660d2eff, styles.r_fc7473ca, styles.r_5f22e64f, styles.r_ceb69a6b, `${
              sortBy === sort.key ? cx(styles.r_6bceb016, styles.r_72a4c7cd) : cx(styles.r_f2b23104, styles.r_eb6abb1f, styles.r_d8a68f7c)}`)


              }>

                {sort.label}
              </button>
            )}
          </div>
        </div>

        {/* 作品列表 */}
        {loading ?
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_9a638cfe, styles.r_4558bce6, styles.r_0c3bc985)}>
            {Array.from({ length: 8 }).map((_, i) =>
          <div key={i} className={styles.r_d59b9794}>
                <div className={cx(styles.r_b59cd297, styles.r_f2b23104, styles.r_1301e5c1)} />
                <div className={cx(styles.r_eb6e8b88, styles.r_6f7e013d)}>
                  <div className={cx(styles.r_11e59c6d, styles.r_1d9f2d98, styles.r_07389a77, styles.r_f2b23104)} />
                  <div className={cx(styles.r_6a60c09e, styles.r_b7ce0d2f, styles.r_07389a77, styles.r_f2b23104)} />
                </div>
              </div>
          )}
          </div> :
        entries.length === 0 ?
        <div className={cx(styles.r_02cafd38, styles.r_ca6bf630)}>
            <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>📷</div>
            <div className={cx(styles.r_42536e69, styles.r_2689f395, styles.r_399e11a5, styles.r_a77ed4d9)}>还没有作品</div>
            <p className={cx(styles.r_fc7473ca, styles.r_7b89cd85, styles.r_da019856)}>成为第一个参赛的人吧</p>
          </div> :

        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_9a638cfe, styles.r_4558bce6, styles.r_0c3bc985)}>
            {entries.map((entry) =>
          <EntryCard
            key={entry.id}
            entry={entry}
            canVote={contest.allowVoting && contest.status === 'voting'}
            onVote={handleVote} />

          )}
          </div>
        }
      </div>
    </Shell>);

}

function EntryCard({
  entry,
  canVote,
  onVote




}: {entry: Entry;canVote: boolean;onVote: (id: string) => void;}) {
  return (
    <div className={cx(styles.r_64292b1c, styles.r_2cd02d11)}>
      <div className={cx(styles.r_d89972fe, styles.r_b59cd297, styles.r_7ebecbb6)}>
        <Image
          src={entry.imageUrl}
          alt={entry.title}
          fill
          className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_1a9195e1)}
          unoptimized />

        {canVote &&
        <button
          onClick={(e) => {
            e.preventDefault();
            onVote(entry.id);
          }}
          className={cx(styles.r_da4dbfbc, styles.r_9a2db8f9, styles.r_7b2d6393, styles.r_7660b450, styles.r_ac204c10, styles.r_6c21de57, styles.r_1ca6dd1e, styles.r_29687528, styles.r_ceb69a6b)}>

            <Icon name="heart" size={16} className={styles.r_e3f51cc6} />
          </button>
        }
      </div>
      <div className={styles.r_eb6e8b88}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a77ed4d9)}>
          <Avatar src={entry.user.avatar} alt={entry.user.name} size={20} />
          <span className={cx(styles.r_359090c2, styles.r_02eb621e, styles.r_f283ea9b)}>{entry.user.name}</span>
        </div>
        <h3 className={cx(styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_f50e2015, styles.r_65281709)}>
          {entry.title}
        </h3>
        {entry.species &&
        <p className={cx(styles.r_359090c2, styles.r_7b89cd85, styles.r_a77ed4d9)}>{entry.species.name}</p>
        }
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_359090c2, styles.r_66a36c90)}>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="heart" size={12} />
            {entry._count.votes}
          </span>
          <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
            <Icon name="eye" size={12} />
            {entry.viewCount}
          </span>
        </div>
      </div>
    </div>);

}