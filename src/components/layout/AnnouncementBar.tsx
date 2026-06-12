/**
 * 全站站内公告横幅
 *
 * 行为:
 *  - 拉 /api/announcements/active
 *  - 用户可一条条 next 浏览(多条时显示「1/3 →」)
 *  - 单条「✕」可关闭,该条 24 小时内不再展示(localStorage)
 *  - level=info(蓝) / warning(琥珀) / important(玫红)
 *
 * 位置:Shell 里、Header 之下、Banner 之上
 */
'use client';

import { useEffect, useState } from 'react';
import { api } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import styles from './AnnouncementBar.module.scss';
import { cx } from '@/lib/style-utils';



interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string; // info | warning | important
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

const STYLE: Record<string, {bg: string;text: string;icon: string;}> = {
  info: {
    bg: cx(styles.r_3cc00fe7, styles.r_cf740793),
    text: styles.r_8f96417c,
    icon: 'ℹ️'
  },
  warning: {
    bg: cx(styles.r_67d2289d, styles.r_97f24a4b),
    text: styles.r_67e74965,
    icon: '⚠️'
  },
  important: {
    bg: cx(styles.r_0759a0f1, styles.r_959f4a9f),
    text: styles.r_7cb2b271,
    icon: '📢'
  }
};

export function AnnouncementBar() {
  const [list, setList] = useState<Announcement[]>([]);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.
    get<Announcement[]>('/api/announcements/active').
    then((arr) => {
      const filtered = (arr || []).filter((a) => !isDismissed(a.id));
      setList(filtered);
    }).
    catch(() => null).
    finally(() => setLoaded(true));
  }, []);

  if (!loaded || list.length === 0) return null;
  if (idx >= list.length) return null;

  const cur = list[idx];
  const style = STYLE[cur.level] ?? STYLE.info;

  const onDismiss = () => {
    dismiss(cur.id);
    const next = list.filter((a) => a.id !== cur.id);
    setList(next);
    if (idx >= next.length) setIdx(0);
  };

  const onNext = () => setIdx((i) => (i + 1) % list.length);

  return (
    <div className={cn(styles.r_65fdbade, style.bg)}>
      <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_da310242, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_2499ab8d)}>
        <span className={cx(styles.r_012fbd12, styles.r_4ee73492, styles.r_c2385a46)}>{style.icon}</span>
        <div className={cn(cx(styles.r_7e0b7cdf, styles.r_36e579c0, styles.r_f283ea9b), style.text)}>
          <b className={styles.r_82cc6c65}>{cur.title}</b>
          <span className={styles.r_714816ef}>{cur.content}</span>
        </div>
        {list.length > 1 &&
        <button
          type="button"
          onClick={onNext}
          className={cn(cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_bf068a78),

          style.text
          )}
          title="下一条">

            {idx + 1}/{list.length} →
          </button>
        }
        <button
          type="button"
          onClick={onDismiss}
          className={cn(cx(styles.r_012fbd12, styles.r_0b8c506a, styles.r_5da1d525), style.text)}
          title="关闭(24 小时不再显示这条)">

          ✕
        </button>
      </div>
    </div>);

}