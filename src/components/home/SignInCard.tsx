'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { Icon } from '@/components/ui/Icon';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import styles from './SignInCard.module.scss';
import { cx } from '@/lib/style-utils';



function useTodaySignedCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.
    get<{count: number;}>("/api/stats/signed-today").
    then((r) => {
      if (!cancelled) setN(r.count);
    }).
    catch(() => null);
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
  const monthLabel = new Date().toLocaleDateString("zh-CN", {
    year: 'numeric',
    month: 'long'
  });

  if (!user) {
    return (
      <div className={styles.r_8e63407b}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <div>
            <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>今日签到</div>
            <div className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_5f6a59f1, styles.r_3032cae0)}>
              {todaySignedCount}{' '}
              <span className={cx(styles.r_359090c2, styles.r_8ecebc9f)}>人</span>
            </div>
          </div>
          <Link
            href="/login?redirect=/"
            className={cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_24f5f8c9, styles.r_af7490b1)}>

            立即签到
          </Link>
        </div>
      </div>);

  }

  return (
    <div className={styles.r_2cd02d11}>
      {/* 顶部渐变头 */}
      <div className={cx(styles.r_6ae7db2c, styles.r_925d3564, styles.r_0a6f1c29, styles.r_f0faeb26, styles.r_1b2d54a3)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <div className={cx(styles.r_60fbb771, styles.r_ed8a5df7, styles.r_2bbcfc3b, styles.r_3960ffc2, styles.r_86843cf1, styles.r_ac204c10, styles.r_2cf6fd42, styles.r_fc7473ca)}>
              <Icon name="check" size={16} className={styles.r_72a4c7cd} />
            </div>
            <div>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_72a4c7cd)}>
                {signedInToday ? '今日已签到' : '每日签到'}
              </div>
              <div className={cx(styles.r_d058ca6d, styles.r_201d4d37)}>
                {signInStreak > 0 ? `已连续 ${signInStreak} 天` : '开始你的连续签到'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signIn()}
            disabled={signedInToday}
            className={cn(cx(styles.r_ac204c10, styles.r_f0faeb26, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_0fe7d7d8),

            signedInToday ? cx(styles.r_29b733e4, styles.r_2cf6fd42, styles.r_ed24b98e) : cx(styles.r_5e10cdb8, styles.r_b17d6a13, styles.r_67d80414, styles.r_438b2237)


            )}>

            {signedInToday ?
            <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}>
                <Icon name="check" size={14} />
                已签
              </span> :

            '签到'
            }
          </button>
        </div>
      </div>

      {/* 统计行 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_f0faeb26, styles.r_e7ee55ac)}>
        <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
          今日 <b className={styles.r_5f6a59f1}>{todaySignedCount}</b> 人签到
        </div>
        <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
          连续 <b className={styles.r_5f6a59f1}>{signInStreak}</b> 天
        </div>
      </div>

      {/* 月历 */}
      <div className={styles.r_8e63407b}>
        <div className={cx(styles.r_fbe25fd3, styles.r_308fc069, styles.r_1dc571a3, styles.r_6c4cc49e)}>
          {monthLabel}
        </div>

        <div className={cx(styles.r_d7c1392c, styles.r_f3c543ad, styles.r_67d5ae42, styles.r_44ee8ba0, styles.r_ca6bf630, styles.r_1dc571a3, styles.r_6c4cc49e)}>
          {['一', '二', '三', '四', '五', '六', '日'].map((d) =>
          <div key={d}>{d}</div>
          )}
        </div>

        <div className={cx(styles.r_f3c543ad, styles.r_67d5ae42, styles.r_44ee8ba0)}>
          {cells.map((c, i) =>
          c == null ?
          <div key={i} /> :

          <div
            key={i}
            className={cn(cx(styles.r_f3c543ad, styles.r_d0a52b31, styles.r_67d66567, styles.r_421ac2be, styles.r_1dc571a3, styles.r_3032cae0, styles.r_ceb69a6b),

            c.signed ? cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_438b2237) :

            c.today ? cx(styles.r_65935df5, styles.r_a29b7a64, styles.r_3883b0f9, styles.r_e83a7042, styles.r_b17d6a13) :

            c.future ? styles.r_e55bc853 : cx(styles.r_9ac94195, styles.r_69335b95)


            )}
            title={
            c.signed ?
            `${c.day} 日 已签到` :
            c.today ?
            `今天(${c.day} 日)` :
            c.future ?
            `${c.day} 日(未来)` :
            `${c.day} 日`
            }>

                {c.day}
              </div>

          )}
        </div>
      </div>
    </div>);

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
      future: d > todayDate
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}