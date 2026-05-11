'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

function useTodaySignedCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ count: number }>('/api/stats/signed-today')
      .then((r) => {
        if (!cancelled) setN(r.count);
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, []);
  return n;
}

export function SignInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();
  const { t } = useI18n();
  const todaySignedCount = useTodaySignedCount();

  const cells = useMemo(
    () => buildCells(signInStreak, signedInToday),
    [signInStreak, signedInToday]
  );
  const monthLabel = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });

  if (!user) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] text-leaf-700/70">今日签到</div>
            <div className="text-xl font-bold text-leaf-700 tabular-nums">
              {todaySignedCount}{' '}
              <span className="text-xs font-normal">人</span>
            </div>
          </div>
          <Link
            href="/login?redirect=/"
            className="btn bg-leaf-500 text-white hover:bg-leaf-600 !px-4"
          >
            立即签到
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* 顶部渐变头 */}
      <div className="bg-gradient-to-r from-leaf-500 to-leaf-600 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm">
              <Icon name="check" size={16} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {signedInToday ? '今日已签到' : '每日签到'}
              </div>
              <div className="text-[11px] text-white/80">
                {signInStreak > 0 ? `已连续 ${signInStreak} 天` : '开始你的连续签到'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={signedInToday}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-all',
              signedInToday
                ? 'cursor-not-allowed bg-white/20 text-white/70'
                : 'bg-white text-leaf-600 hover:bg-white/90 shadow-sm'
            )}
          >
            {signedInToday ? (
              <span className="flex items-center gap-1">
                <Icon name="check" size={14} />
                已签
              </span>
            ) : (
              '签到'
            )}
          </button>
        </div>
      </div>

      {/* 统计行 */}
      <div className="flex items-center justify-between border-b border-leaf-100 px-4 py-2.5">
        <div className="text-[11px] text-leaf-700/70">
          今日 <b className="text-leaf-700">{todaySignedCount}</b> 人签到
        </div>
        <div className="text-[11px] text-leaf-700/70">
          连续 <b className="text-leaf-700">{signInStreak}</b> 天
        </div>
      </div>

      {/* 月历 */}
      <div className="p-4">
        <div className="mb-2.5 text-right text-[10px] text-leaf-700/60">
          {monthLabel}
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] text-leaf-700/60">
          {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) =>
            c == null ? (
              <div key={i} />
            ) : (
              <div
                key={i}
                className={cn(
                  'grid h-7 place-items-center rounded-md text-[10px] tabular-nums transition-colors',
                  c.signed
                    ? 'bg-leaf-500 text-white shadow-sm'
                    : c.today
                    ? 'border-2 border-dashed border-leaf-400 font-semibold text-leaf-600'
                    : c.future
                    ? 'text-leaf-300'
                    : 'bg-leaf-50/50 text-leaf-700/70'
                )}
                title={
                  c.signed
                    ? `${c.day} 日 已签到`
                    : c.today
                    ? `今天(${c.day} 日)`
                    : c.future
                    ? `${c.day} 日(未来)`
                    : `${c.day} 日`
                }
              >
                {c.day}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

interface Cell {
  day: number;
  signed: boolean;
  today: boolean;
  future: boolean;
}

function buildCells(streak: number, todayDone: boolean): (Cell | null)[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  const first = new Date(year, month, 1);
  const firstWeekIdx = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const signedDays = new Set<number>();
  let cursor = todayDone ? todayDate : todayDate - 1;
  for (let i = 0; i < streak && cursor >= 1; i++) {
    signedDays.add(cursor);
    cursor--;
  }

  const cells: (Cell | null)[] = [];
  for (let i = 0; i < firstWeekIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      signed: signedDays.has(d),
      today: d === todayDate,
      future: d > todayDate,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
