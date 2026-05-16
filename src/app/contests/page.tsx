'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import { timeAgo } from '@/lib/utils';

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

const statusMap: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'text-ink-400' },
  upcoming: { label: '即将开始', color: 'text-blue-600' },
  active: { label: '进行中', color: 'text-green-600' },
  voting: { label: '投票中', color: 'text-orange-600' },
  ended: { label: '已结束', color: 'text-ink-500' },
  cancelled: { label: '已取消', color: 'text-red-600' },
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
      console.error('加载大赛失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-800 mb-2">🏆 摄影大赛</h1>
          <p className="text-sm text-ink-500">展示你的多肉植物摄影作品，赢取丰厚奖品</p>
        </div>

        {/* 标签页 */}
        <div className="flex gap-2 mb-6 border-b border-leaf-200">
          {[
            { key: 'active', label: '进行中' },
            { key: 'voting', label: '投票中' },
            { key: 'upcoming', label: '即将开始' },
            { key: 'ended', label: '已结束' },
            { key: 'all', label: '全部' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-leaf-600 border-b-2 border-leaf-600'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 大赛列表 */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-video bg-leaf-100 rounded-t-xl" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 rounded bg-leaf-100" />
                  <div className="h-4 w-full rounded bg-leaf-100" />
                  <div className="h-4 w-2/3 rounded bg-leaf-100" />
                </div>
              </div>
            ))}
          </div>
        ) : contests.length === 0 ? (
          <div className="card py-16 text-center">
            <div className="text-4xl mb-3">🏆</div>
            <div className="text-lg font-medium text-ink-800 mb-2">暂无大赛</div>
            <p className="text-sm text-ink-500">敬请期待精彩的摄影大赛</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {contests.map((contest) => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function ContestCard({ contest }: { contest: Contest }) {
  const statusInfo = statusMap[contest.status] || statusMap.draft;

  return (
    <Link
      href={`/contests/${contest.id}`}
      className="card card-hoverable group overflow-hidden"
    >
      {/* 封面 */}
      <div className="relative aspect-video bg-gradient-to-br from-leaf-100 to-leaf-200">
        {contest.cover ? (
          <Image
            src={contest.cover}
            alt={contest.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex items-center justify-center h-full text-6xl">
            🏆
          </div>
        )}
        {/* 状态标签 */}
        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm ${statusInfo.color}`}>
          {statusInfo.label}
        </div>
        {contest.featured && (
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
            精选
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-ink-800 mb-2 line-clamp-1">
          {contest.title}
        </h3>
        <p className="text-sm text-ink-600 mb-4 line-clamp-2">
          {contest.description}
        </p>

        {/* 统计 */}
        <div className="flex items-center gap-4 text-xs text-ink-500 mb-4">
          <span className="flex items-center gap-1">
            <Icon name="image" size={14} />
            {contest._count.entries} 作品
          </span>
          <span className="flex items-center gap-1">
            <Icon name="heart" size={14} />
            {contest.voteCount} 票
          </span>
          <span className="flex items-center gap-1">
            <Icon name="eye" size={14} />
            {contest.viewCount}
          </span>
        </div>

        {/* 时间 */}
        <div className="text-xs text-ink-400">
          {contest.status === 'active' && (
            <span>截止时间：{new Date(contest.endAt).toLocaleDateString()}</span>
          )}
          {contest.status === 'voting' && contest.votingEndAt && (
            <span>投票截止：{new Date(contest.votingEndAt).toLocaleDateString()}</span>
          )}
          {contest.status === 'upcoming' && (
            <span>开始时间：{new Date(contest.startAt).toLocaleDateString()}</span>
          )}
          {contest.status === 'ended' && (
            <span>已于 {new Date(contest.endAt).toLocaleDateString()} 结束</span>
          )}
        </div>
      </div>
    </Link>
  );
}
