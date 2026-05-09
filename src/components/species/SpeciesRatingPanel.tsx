'use client';

/**
 * 品种打分面板 — 用户对该品种的难度打分。
 *
 * 展示:
 *   - 大字平均分 + 总票数
 *   - 1-5 星交互(已登录用户可打分,hover 预览,点击保存)
 *   - 头像墙(最近打分的 N 位用户)
 *
 * 数据来源:
 *   - SSR 阶段 species.difficulty / ratingSum / ratingCount 给到 props
 *   - 客户端打分操作走 /api/species/:id/rate POST/DELETE
 *   - 头像墙首次进入视口时拉 /api/species/:id/raters?limit=10
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface RaterItem {
  id: string;
  score: number;
  createdAt: string;
  user: { id: string; name: string; avatar: string; level: number };
}
interface RatersResp {
  avg: number;
  ratingCount: number;
  myScore: number | null;
  items: RaterItem[];
}

export function SpeciesRatingPanel({
  speciesId,
  fallbackAvg, // species.difficulty(没人打分时显示这个)
}: {
  speciesId: string;
  fallbackAvg: number;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<RatersResp | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`)
      .then(setData)
      .catch(() => null);
  }, [speciesId]);

  const avg = data?.avg ?? fallbackAvg;
  const count = data?.ratingCount ?? 0;
  const myScore = data?.myScore ?? null;

  const submit = async (score: number) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/api/species/${speciesId}/rate`, { score });
      // 重拉数据
      const r = await api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`);
      setData(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '打分失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('撤回我的打分?')) return;
    setBusy(true);
    try {
      await api.delete(`/api/species/${speciesId}/rate`);
      const r = await api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`);
      setData(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const display = hover ?? myScore ?? Math.round(avg);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-3">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-amber-600">{avg.toFixed(1)}</span>
          <span className="text-xs text-leaf-700/60">/ 5</span>
        </div>
        <div className="text-xs text-leaf-700/70">
          {count > 0 ? `${count} 人参与打分` : '还没有人打分'}
        </div>
      </div>

      {/* 1-5 星交互 */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={busy}
              onMouseEnter={() => setHover(n)}
              onClick={() => submit(n)}
              className={cn(
                'text-2xl transition-transform hover:scale-110',
                n <= display ? 'text-amber-500' : 'text-leaf-200',
                busy && 'opacity-50'
              )}
              title={`${n} 星`}
            >
              {n <= display ? '★' : '☆'}
            </button>
          ))}
        </div>
        {myScore !== null && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-[11px] text-leaf-700/70 underline hover:text-rose-600"
          >
            撤回我的打分
          </button>
        )}
      </div>

      {!user && (
        <div className="text-[11px] text-leaf-700/60">
          <Link href={`/login`} className="text-leaf-700 underline">登录</Link> 后参与打分
        </div>
      )}
      {myScore !== null && (
        <div className="text-[11px] text-leaf-700/70">
          你打了 <span className="text-amber-600 font-medium">{myScore}</span> 星
        </div>
      )}
      {err && (
        <div className="rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700">{err}</div>
      )}

      {/* 头像墙 */}
      {data && data.items.length > 0 && (
        <div className="border-t border-leaf-100 pt-3">
          <div className="mb-2 text-[11px] text-leaf-700/70">
            最近 {data.items.length} 位打分肉友
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.items.map((r) => (
              <Link
                key={r.id}
                href={`/user/${r.user.id}`}
                title={`${r.user.name} · ${r.score} 星`}
                className="group relative"
              >
                <Avatar src={r.user.avatar} alt={r.user.name} size={32} />
                <span
                  className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 px-1 text-[8px] font-bold text-white"
                  style={{ minWidth: 14, textAlign: 'center' }}
                >
                  {r.score}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
