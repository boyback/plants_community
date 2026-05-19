'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

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
      console.error('加载大赛失败:', error);
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: Entry[] }>(
        `/api/contests/${params.id}/entries?sort=${sortBy}&limit=100`
      );
      setEntries(data.items);
    } catch (error) {
      console.error('加载作品失败:', error);
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
        userId: user.id,
      });
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || '投票失败');
    }
  };

  if (!contest) {
    return (
      <Shell>
        <div className="max-w-6xl mx-auto py-16 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <div className="text-lg font-medium text-ink-800">加载中...</div>
        </div>
      </Shell>
    );
  }

  const rules = JSON.parse(contest.rules || '[]');
  const prizes = JSON.parse(contest.prizes || '[]');

  return (
    <Shell>
      <div className="max-w-6xl mx-auto">
        {/* 大赛头部 */}
        <div className="card mb-6">
          {contest.cover && (
            <div className="relative aspect-[3/1] rounded-t-xl overflow-hidden">
              <Image
                src={contest.cover}
                alt={contest.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-ink-800 mb-2">
                  {contest.title}
                </h1>
                <p className="text-ink-600 mb-4">{contest.description}</p>
                <div className="flex items-center gap-4 text-sm text-ink-500">
                  <span className="flex items-center gap-1">
                    <Icon name="image" size={16} />
                    {contest.entryCount} 作品
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="heart" size={16} />
                    {contest.voteCount} 票
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="eye" size={16} />
                    {contest.viewCount} 浏览
                  </span>
                </div>
              </div>
              {contest.status === 'active' && user && (
                <Link
                  href={`/contests/${contest.id}/submit`}
                  className="btn-primary"
                >
                  提交作品
                </Link>
              )}
            </div>

            {/* 规则和奖品 */}
            <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-leaf-200">
              {rules.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-ink-800 mb-2">📋 参赛规则</h3>
                  <ul className="text-sm text-ink-600 space-y-1">
                    {rules.map((rule: string, i: number) => (
                      <li key={i}>• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {prizes.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-ink-800 mb-2">🎁 奖品设置</h3>
                  <ul className="text-sm text-ink-600 space-y-1">
                    {prizes.map((prize: string, i: number) => (
                      <li key={i}>• {prize}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 排序 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-ink-800">参赛作品</h2>
          <div className="flex gap-2">
            {[
              { key: 'latest', label: '最新' },
              { key: 'popular', label: '最热' },
            ].map((sort) => (
              <button
                key={sort.key}
                onClick={() => setSortBy(sort.key)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  sortBy === sort.key
                    ? 'bg-leaf-600 text-white'
                    : 'bg-leaf-100 text-ink-700 hover:bg-leaf-200'
                }`}
              >
                {sort.label}
              </button>
            ))}
          </div>
        </div>

        {/* 作品列表 */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-leaf-100 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-leaf-100" />
                  <div className="h-3 w-1/2 rounded bg-leaf-100" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl mb-3">📷</div>
            <div className="text-lg font-medium text-ink-800 mb-2">还没有作品</div>
            <p className="text-sm text-ink-500 mb-4">成为第一个参赛的人吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                canVote={contest.allowVoting && contest.status === 'voting'}
                onVote={handleVote}
              />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function EntryCard({
  entry,
  canVote,
  onVote,
}: {
  entry: Entry;
  canVote: boolean;
  onVote: (id: string) => void;
}) {
  return (
    <div className="card card-hoverable group overflow-hidden">
      <div className="relative aspect-square bg-leaf-50">
        <Image
          src={entry.imageUrl}
          alt={entry.title}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          unoptimized
        />
        {canVote && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onVote(entry.id);
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white transition-colors"
          >
            <Icon name="heart" size={16} className="text-red-500" />
          </button>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar src={entry.user.avatar} alt={entry.user.name} size={20} />
          <span className="text-xs text-ink-600 truncate">{entry.user.name}</span>
        </div>
        <h3 className="text-sm font-medium text-ink-800 line-clamp-1 mb-1">
          {entry.title}
        </h3>
        {entry.species && (
          <p className="text-xs text-ink-500 mb-2">{entry.species.name}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Icon name="heart" size={12} />
            {entry._count.votes}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="eye" size={12} />
            {entry.viewCount}
          </span>
        </div>
      </div>
    </div>
  );
}
