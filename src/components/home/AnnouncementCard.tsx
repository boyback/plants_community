/**
 * 首页右栏「站内公告」卡(取代横幅)
 *
 * - 列出当前生效中的公告(最多 3 条)
 * - 不同 level 不同色
 * - 单条可关闭(localStorage 24h 不再展示)
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import styles from './AnnouncementCard.module.scss';
import { cx } from '@/lib/style-utils';



interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string;
  createdAt: string;
}

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const KEY_PREFIX = 'announce.dismiss.';

function isDismissed(id: string): boolean {
  if (typeof window === 'undefined') return false;
  const v = Number(localStorage.getItem(KEY_PREFIX + id) || '0');
  return !!v && Date.now() - v < DISMISS_TTL_MS;
}

function dismiss(id: string) {
  try {
    localStorage.setItem(KEY_PREFIX + id, String(Date.now()));
  } catch {}
}

const LEVEL_STYLE: Record<string, {dot: string;bg: string;text: string;}> = {
  info: { dot: styles.r_c77bbf4a, bg: '', text: styles.r_399e11a5 },
  warning: { dot: styles.r_a5a0d879, bg: '', text: styles.r_399e11a5 },
  important: { dot: styles.r_45a732a4, bg: '', text: styles.r_399e11a5 }
};

export function AnnouncementCard() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.
    get<Announcement[]>('/api/announcements/active').
    then((arr) => {
      const filtered = (arr || []).filter((a) => !isDismissed(a.id)).slice(0, 3);
      setList(filtered);
    }).
    catch(() => null).
    finally(() => setLoaded(true));
  }, []);

  if (!loaded || list.length === 0) return null;

  return (
    <div className={styles.r_2cd02d11}>
      <div className={cx(styles.r_65fdbade, styles.r_38748e06, styles.r_f0faeb26, styles.r_e7ee55ac)}>
        <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>📣 站内公告</span>
      </div>
      <ul className={cx(styles.r_fa6acbf8, styles.r_6f8e581a)}>
        {list.map((a) => {
          const s = LEVEL_STYLE[a.level] ?? LEVEL_STYLE.info;
          return (
            <li key={a.id} className={cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_f0faeb26, styles.r_e7ee55ac)}>
              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e)}>
                <span className={cn(cx(styles.r_aac62f0e, styles.r_095acb27, styles.r_c696a089, styles.r_012fbd12, styles.r_ac204c10), s.dot)} />
                <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                  <div className={cn(cx(styles.r_69cdf25a, styles.r_2689f395), s.text)}>{a.title}</div>
                  <p className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_d058ca6d, styles.r_517d113c, styles.r_69335b95)}>
                    {a.content}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dismiss(a.id);
                    setList((arr) => arr.filter((x) => x.id !== a.id));
                  }}
                  className={cx(styles.r_7065497e, styles.r_67d6184a, styles.r_181f3d6c, styles.r_4d094717, styles.r_46353e18)}
                  title="关闭(24 小时不再显示)">

                  ✕
                </button>
              </div>
            </li>);

        })}
      </ul>
    </div>);

}