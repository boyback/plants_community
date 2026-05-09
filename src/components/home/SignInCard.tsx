'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

/**
 * 签到 + 月历 整合卡(右栏最顶)
 * - 头部:用户彩条(头像 + level/帖子/粉丝)
 * - 中部:连续天数 + 「立即签到」按钮 + 提示
 * - 底部:本月日历(7 列周一开头),已签实色 / 今天虚框 / 未来淡显
 */
export function SignInCard() {
  const { user, signedInToday, signIn, signInStreak } = useAuth();
  const { t } = useI18n();

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
      <div className="card p-5">
        <div className="text-sm font-semibold text-ink-800">
          {t('home.signIn.welcomeTitle')}
        </div>
        <p className="mt-1 text-xs text-leaf-700/70">
          {t('home.signIn.welcomeSub')}
        </p>
        <div className="mt-3 flex gap-2">
          <Link href="/login" className="btn-primary flex-1 justify-center">
            {t('home.signIn.login')}
          </Link>
          <Link href="/register" className="btn-outline flex-1 justify-center">
            {t('home.signIn.register')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* 用户彩条 + 提示 */}
      <div className="bg-gradient-to-br from-leaf-400 to-leaf-600 p-4 text-white">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatar} alt={user.name} size={44} ring />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className="text-[11px] opacity-90">
              {t('home.signIn.userMeta', {
                level: user.level,
                posts: user.posts,
                followers: user.followers,
              })}
            </div>
          </div>
        </div>
        <div className="mt-2 text-[11px] leading-5 opacity-90">
          {t('home.signIn.tip')}
        </div>
      </div>

      {/* 签到主区 */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-leaf-700/70">
              {t('home.signIn.streakLabel')}
            </div>
            <div className="text-xl font-bold text-leaf-700">
              {signInStreak}{' '}
              <span className="text-xs font-normal">
                {t('home.signIn.daysSuffix')}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={signedInToday}
            className={cn(
              'btn !px-4',
              signedInToday
                ? 'cursor-not-allowed bg-leaf-100 text-leaf-600'
                : 'bg-leaf-500 text-white hover:bg-leaf-600'
            )}
          >
            {signedInToday ? (
              <>
                <Icon name="check" size={14} />
                {t('home.signIn.signedToday')}
              </>
            ) : (
              t('home.signIn.signInNow')
            )}
          </button>
        </div>

        {/* 月历 */}
        <div className="mt-4 border-t border-leaf-100 pt-3">
          <div className="mb-2 flex items-center justify-between text-[11px] text-leaf-700/70">
            <span>📅 本月签到</span>
            <span>{monthLabel}</span>
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
