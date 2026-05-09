'use client';

import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

/**
 * 当月签到日历(小型概览)
 * - 周一开头 7 列
 * - 已签到的天数填实
 * - 今天高亮
 * - 未来日期淡显
 *
 * 数据精度暂时只能根据 signInStreak 推断「最近连续 N 天」,
 * 后端如果以后给 monthlyStats(/me) 接口可以精确显示每天是否签到
 */
export function MonthCalendar() {
  const { user, signedInToday, signInStreak } = useAuth();

  const cells = useMemo(() => buildCells(signInStreak, signedInToday), [
    signInStreak,
    signedInToday,
  ]);
  const monthLabel = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  });

  if (!user) return null;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-800">📅 本月签到</h3>
        <span className="text-[11px] text-leaf-700/70">{monthLabel}</span>
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
                  ? 'border-2 border-dashed border-leaf-400 text-leaf-600 font-semibold'
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

      <div className="mt-3 flex items-center justify-between text-[11px] text-leaf-700/70">
        <span>
          连续 <b className="text-leaf-700">{signInStreak}</b> 天
        </span>
        <span>{signedInToday ? '今日已签 ✅' : '今日未签 ⏳'}</span>
      </div>
    </div>
  );
}

interface Cell {
  day: number;
  /** 该日是否在「最近连续 streak 天」内,即视为已签 */
  signed: boolean;
  today: boolean;
  future: boolean;
}

/**
 * 构建当月日历单元格(周一为第一列;未到 1 号的位用 null 占位)
 *
 * 「已签」近似算法:今天(若已签)往前 streak 天;未签则今天往前 streak 天
 */
function buildCells(streak: number, todayDone: boolean): (Cell | null)[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const todayDate = now.getDate();

  // 当月 1 号是周几(周一=1...周日=0/7)
  const first = new Date(year, month, 1);
  // JS getDay():周日=0...周六=6;转换:周一=0,周日=6
  const firstWeekIdx = (first.getDay() + 6) % 7;
  // 当月有多少天
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 已签到的日期集合(连续 streak 天往前)
  const signedDays = new Set<number>();
  // 如果今天已签,从今天开始;否则从昨天开始
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
  // 末尾补满 7 的倍数,视觉对齐
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
