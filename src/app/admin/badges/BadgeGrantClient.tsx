'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './BadgeGrantClient.module.scss';
import { cx } from '@/lib/style-utils';
import { Textarea } from '@/components/ui/Textarea';



interface BadgeItem {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  obtainedCount: number;
}

export function BadgeGrantClient({
  badges,
  userTotal



}: {badges: BadgeItem[];userTotal: number;}) {
  const router = useRouter();
  const [selected, setSelected] = useState<BadgeItem | null>(null);
  const [userIds, setUserIds] = useState('');
  const [toAll, setToAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const grant = async () => {
    if (!selected) return;
    const ids = userIds.split(/\s+|,|;/).map((s) => s.trim()).filter(Boolean);
    if (!toAll && ids.length === 0) return toast.error('请输入至少一个用户 ID,或勾选「发给所有用户」');
    if (toAll && !confirm(`确认给全部 ${userTotal} 个用户发放徽章「${selected.name}」?此操作不可撤销。`)) return;
    if (!toAll && !confirm(`给 ${ids.length} 个用户发放徽章「${selected.name}」?`)) return;
    setBusy(true);
    try {
      const r = await api.post<{granted: number;total: number;badgeName: string;}>(
        '/api/admin/badges/grant',
        {
          badgeId: selected.id,
          userIds: toAll ? undefined : ids,
          all: toAll
        }
      );
      setResult(`✅ 已给 ${r.granted}/${r.total} 人发放「${r.badgeName}」`);
      setUserIds('');
      setToAll(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '发放失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🏅 徽章发放</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>点击下方徽章卡片选择,然后输入用户 ID 列表发放</p>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3, styles.r_d59f314f, styles.r_76125f2c)}>
        {badges.map((b) =>
        <button
          key={b.id}
          type="button"
          onClick={() => {
            setSelected(b);
            setResult(null);
          }}
          className={cx(
            styles.r_60fbb771,
            styles.r_8dddea07,
            styles.r_3960ffc2,
            styles.r_a217b4ea,
            styles.r_65935df5,
            styles.r_5e10cdb8,
            styles.r_8e63407b,
            styles.r_ca6bf630,
            styles.r_0fe7d7d8,
            selected?.id === b.id ? cx(styles.r_30cfe115, styles.r_06bbb431) : cx(styles.r_358505cf, styles.r_00eba3fb)
          )}>

            <span className={styles.r_751fb0d1}>{b.icon}</span>
            <div className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>{b.name}</div>
            <div className={cx(styles.r_15e1b1f4, styles.r_054cb4e3, styles.r_1dc571a3, styles.r_7b89cd85)}>{b.description}</div>
            <div className={cx(styles.r_50d0d216, styles.r_ac204c10, styles.r_febec8f2, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_eb6abb1f)}>
              已发 {b.obtainedCount}
            </div>
          </button>
        )}
        {badges.length === 0 &&
        <div className={cx(styles.r_2c955d1b, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
            没有徽章(请先在 Prisma Studio 创建 Badge)
          </div>
        }
      </div>

      {selected &&
      <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_c07e54fd)}>
          <h2 className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>
            发放「{selected.icon} {selected.name}」
          </h2>
          <div className={cx(styles.r_6ed543e2, styles.r_359090c2)}>
            <div>
              <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_d058ca6d, styles.r_2689f395, styles.r_02eb621e)}>
                用户 ID 列表(空格 / 逗号 / 换行分隔)
              </label>
              <Textarea
              className={cx(styles.r_6da6a3c3, styles.r_739eaa6a, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_d058ca6d)}
              value={userIds}
              onChange={(e) => setUserIds(e.target.value)}
              placeholder="cmojwbr74000czc8wxsx0umvo&#10;cmojwbr79000dzc8w2nnm2ehu"
              disabled={toAll} />

            </div>
            <label className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <input
              type="checkbox"
              checked={toAll}
              onChange={(e) => setToAll(e.target.checked)} />

              <span>发给全部 {userTotal} 个用户(小心使用)</span>
            </label>
          </div>

          {result &&
        <div className={cx(styles.r_eccd13ef, styles.r_5f22e64f, styles.r_7ebecbb6, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5f6a59f1)}>
              {result}
            </div>
        }

          <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
            <button
            type="button"
            onClick={() => {
              setSelected(null);
              setResult(null);
            }}
            className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>

              取消
            </button>
            <button
            type="button"
            disabled={busy}
            onClick={grant}
            className={cx(styles.r_5f22e64f, styles.r_01d0b06c, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_72a4c7cd, styles.r_218d0c3a)}>

              {busy ? '发放中...' : '发放'}
            </button>
          </div>
        </section>
      }
    </div>);

}
