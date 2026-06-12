'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Empty } from '@/components/ui/Empty';
import { cn, timeAgo } from '@/lib/utils';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { usePullToRefresh, PullIndicator } from '@/lib/hooks/usePullToRefresh';
import type { Notification } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const tabs = [
{ key: 'all', label: '全部' },
{ key: 'like', label: '赞' },
{ key: 'comment', label: '评论' },
{ key: 'follow', label: '关注' },
{ key: 'system', label: '系统' }] as
const;

type TabKey = (typeof tabs)[number]['key'];

const typeStyle: Record<Notification['type'], {bg: string;icon: string;}> = {
  like: { bg: cx(styles.r_0759a0f1, styles.r_595fceba), icon: '❤️' },
  comment: { bg: cx(styles.r_7ebecbb6, styles.r_5f6a59f1), icon: '💬' },
  follow: { bg: cx(styles.r_3cc00fe7, styles.r_4c3a8aac), icon: '🤝' },
  system: { bg: cx(styles.r_67d2289d, styles.r_85d79ebf), icon: '🔔' },
  mention: { bg: cx(styles.r_3b5cf6c0, styles.r_06fd2bc1), icon: '@' }
};

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [list, setList] = useState<Notification[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const reload = async () => {
    try {
      const res = await api.get<{items: Notification[];unread: number;}>(
        '/api/notifications'
      );
      setList(res.items);
      setErr(null);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const { bind, status, progress } = usePullToRefresh(reload);

  const filtered = list.filter((n) => tab === 'all' || n.type === tab);

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read', { all: true });
      setList((l) => l.map((n) => ({ ...n, read: true })));
    } catch {









      // ignore
    }};const markRead = async (id: string) => {setList((l) => l.map((n) => n.id === id ? { ...n, read: true } : n));await api.post('/api/notifications/read', { ids: [id] }).catch(() => null);};if (!authLoading && !user) {return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>🔔</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>登录后查看通知</div>
          <Link href="/login?redirect=/notifications" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            去登录
          </Link>
        </div>
      </Shell>);

  }

  return (
    <Shell>
      <div {...bind}>
        <PullIndicator status={status} progress={progress} />
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>通知</h1>
          <p className={cx(styles.r_fc7473ca, styles.r_69335b95)}>
            与你相关的赞、评论、关注和系统消息
          </p>
        </div>
        <button type="button" onClick={markAllRead} className="btn-outline">
          <Icon name="check" size={14} />
          全部标为已读
        </button>
      </div>

      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_1384f66f, styles.r_65fdbade, styles.r_88b684d2)}>
        {tabs.map((t) => {
            const unread = list.filter((n) => !n.read && (t.key === 'all' || n.type === t.key)).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(cx(styles.r_d89972fe, styles.r_e82ae8be, styles.r_f0faeb26, styles.r_e7ee55ac, styles.r_fc7473ca, styles.r_ceb69a6b),

                tab === t.key ? cx(styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_5fa66415, styles.r_9825203a)
                )}>

              {t.label}
              {unread > 0 &&
                <span className={cx(styles.r_f58b0257, styles.r_ac204c10, styles.r_45a732a4, styles.r_45d82811, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                  {unread}
                </span>
                }
              {tab === t.key &&
                <span className={cx(styles.r_da4dbfbc, styles.r_b6027879, styles.r_189f036c, styles.r_10db0d55, styles.r_ac204c10, styles.r_45499621)} />
                }
            </button>);

          })}
      </div>

      {loading ?
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div> :
        err ?
        <Empty icon="⚠️" title="加载失败" desc={err} /> :
        filtered.length === 0 ?
        <Empty icon="🔔" title="暂无此类通知" /> :

        <ul className={cx(styles.r_fa6acbf8, styles.r_6f8e581a)}>
          {filtered.map((n) => {
            const ts = typeStyle[n.type];
            const Wrap: React.ElementType = n.link ? Link : 'div';
            return (
              <li key={n.id}>
                <Wrap
                  {...n.link ? { href: n.link } : {}}
                  onClick={() => markRead(n.id)}
                  className={cn(cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3, styles.r_d139dd09, styles.r_cb11fec3, styles.r_ceb69a6b),

                  n.link && cx(styles.r_98dc6304, styles.r_34516836),
                  !n.read && styles.r_54720a96
                  )}>

                  <div
                    className={cn(cx(styles.r_d89972fe, styles.r_f3c543ad, styles.r_426b8b75, styles.r_d854e569, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_42536e69),

                    ts.bg
                    )}>

                    {n.fromUser ?
                    <Avatar src={n.fromUser.avatar} alt={n.fromUser.name} size={40} /> :

                    <span>{ts.icon}</span>
                    }
                    {n.fromUser &&
                    <span className={cx(styles.r_da4dbfbc, styles.r_1b60f5e1, styles.r_c9e05721, styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_1dc571a3, styles.r_ed9d3d83)}>
                        {ts.icon}
                      </span>
                    }
                  </div>
                  <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
                    <div className={cx(styles.r_fc7473ca, styles.r_399e11a5)}>
                      {n.fromUser &&
                      <span className={cx(styles.r_2689f395, styles.r_5f6a59f1)}>{n.fromUser.name} </span>
                      }
                      {n.text}
                    </div>
                    <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read &&
                  <span className={cx(styles.r_50d0d216, styles.r_2f2a842e, styles.r_940924b6, styles.r_012fbd12, styles.r_ac204c10, styles.r_45a732a4)} aria-label="未读" />
                  }
                </Wrap>
              </li>);

          })}
        </ul>
        }
      </div>
    </Shell>);

}