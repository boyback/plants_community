'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/client-api';
import { cn } from '@/lib/utils';

/** 拉取今日全站签到人数(公开接口,未登录也能访问) */
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

/**
 * 签到 + 月历 整合卡(右栏最顶)
 * - 头部:用户彩条(头像 + level/帖子/粉丝)
 * - 中部:连续天数 + 「立即签到」按钮 + 提示
 * - 底部:本月日历(7 列周一开头),已签实色 / 今天虚框 / 未来淡显
 */
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
      {/* 用户彩条 + 提示 */}
      {/* 顶部细绿条:tip 提示 */}
      <div className="bg-gradient-to-br from-leaf-400 to-leaf-600 px-4 py-2.5 text-[11px] leading-5 text-white">
        {t('home.signIn.tip')}
      </div>

      {/* 主区:按钮 + 今日 N · 连签 N 一行 */}
      <div className="p-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={signedInToday}
            className={cn(
              'btn shrink-0 !px-3',
              signedInToday
                ? 'cursor-not-allowed bg-leaf-100 text-leaf-600'
                : 'bg-leaf-500 text-white hover:bg-leaf-600'
            )}
          >
            {signedInToday ? (
              <>
                <Icon name="check" size={14} />
                已签到
              </>
            ) : (
              '签到'
            )}
          </button>
          <div className="min-w-0 flex-1 text-right text-[11px] text-leaf-700/80">
            今日 <b className="text-leaf-700 tabular-nums">{todaySignedCount}</b> 人 · 连签{' '}
            <b className="tabular-nums text-leaf-700">{signInStreak}</b> 天
          </div>
        </div>

        {/* 月历 */}
        <div className="mt-3 border-t border-leaf-100 pt-3">
          <div className="mb-2 text-right text-[10px] text-leaf-700/60">
            {monthLabel}
          </div>

          {/* 周次表头 */}
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-leaf-700/60">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* 日期格 */}
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
    </div>
  );
}

interface Cell {
  day: number;
  signed: boolean;
  today: boolean;
  future: boolean;
}

/**
 * 构建当月日历单元格(周一为第一列)
 * 「已签」根据 signInStreak 推断:今日已签则从今日往前 N 天;未签则从昨日往前 N 天
 */
function buildCells(streak: number, todayDone: boolean): (Cell | null)[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  const first = new Date(year, month, 1);
  const firstWeekIdx = (first.getDay() + 6) % 7; // 周一=0
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
