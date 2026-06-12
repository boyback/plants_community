'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { api } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { User } from '@/lib/types';
import styles from './RecommendUsers.module.scss';
import { cx } from '@/lib/style-utils';



export function RecommendUsers({ users }: {users: User[];}) {
  const { user: me } = useAuth();
  const { t } = useI18n();
  const initial = users.filter((u) => !me || u.id !== me.id).slice(0, 5);
  const [list, setList] = useState<User[]>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [followed, setFollowed] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get<User[]>('/api/users?limit=5&random=1');
      const next = (res || []).filter((u) => !me || u.id !== me.id).slice(0, 5);
      if (next.length > 0) setList(next);
    } finally {
      setRefreshing(false);
    }
  };

  const toggle = async (uid: string) => {
    if (!me) {
      window.location.href = '/login';
      return;
    }
    setFollowed((f) => ({ ...f, [uid]: !f[uid] }));
    try {
      await api.post(`/api/users/${uid}/follow`);
    } catch {
      setFollowed((f) => ({ ...f, [uid]: !f[uid] }));
    }
  };

  return (
    <div className={styles.r_8e63407b}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>🌱 {t('home.recommend.title')}</div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7, styles.r_b29d8adb)}>

          {refreshing ? '换一换…' : t('home.recommend.refresh')}
        </button>
      </div>
      <ul className={styles.r_14dd497e}>
        {list.map((u) =>
        <li key={u.id} className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_7e9a2a25)}>
            <Link href={`/user/${u.id}`}>
              <Avatar src={u.avatar} alt={u.name} size={36} />
            </Link>
            <Link href={`/user/${u.id}`} className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
              <div className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5, styles.r_9825203a)}>
                {u.name}
              </div>
              <div className={cx(styles.r_f283ea9b, styles.r_d058ca6d, styles.r_69335b95)}>{u.bio}</div>
            </Link>
            <button
            type="button"
            className={cn(cx(styles.r_d0a52b31, styles.r_2964b067, styles.r_d058ca6d),

            followed[u.id] ? cx(styles.r_f2b23104, styles.r_5f6a59f1) : cx(styles.r_45499621, styles.r_72a4c7cd, styles.r_24f5f8c9)


            )}
            onClick={() => toggle(u.id)}>

              {followed[u.id] ? t('home.recommend.followedBtn') : t('home.recommend.followBtn')}
            </button>
          </li>
        )}
      </ul>
    </div>);

}