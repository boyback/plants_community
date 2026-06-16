'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './LevelExpManager.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



export type LevelExpRow = {
  level: number;
  name: string;
  expRequired: number;
};

export function LevelExpManager({ rows }: {rows: LevelExpRow[];}) {
  const router = useRouter();
  const [items, setItems] = useState<LevelExpRow[]>(rows);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const updateItem = (level: number, patch: Partial<LevelExpRow>) => {
    setItems((list) => list.map((item) => item.level === level ? { ...item, ...patch } : item));
  };

  const save = async () => {
    const ordered = [...items].sort((a, b) => a.level - b.level);
    if (ordered[0]?.expRequired !== 0) {
      toast.error('Lv.1 所需经验必须为 0');
      return;
    }
    for (let i = 1; i < ordered.length; i += 1) {
      if (ordered[i].expRequired <= ordered[i - 1].expRequired) {
        toast.error(`Lv.${ordered[i].level} 所需经验必须大于 Lv.${ordered[i - 1].level}`);
        return;
      }
    }

    setBusy(true);
    try {
      await api.patch("/api/admin/level-exp", { levels: ordered, note });
      toast.success('已保存等级经验配置');
      router.refresh();
      setNote('');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
      <div className={styles.r_da019856}>
        <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>等级经验配置</h2>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
          配置累计经验 EXP 达到多少时升到对应等级。这里不是积分余额，积分余额用于消费和兑换。
        </p>
      </div>

      <div className={cx(styles.r_2cd02d11, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_358505cf)}>
        <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
          <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
            <tr>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>等级</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>等级名</th>
              <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>累计经验 EXP</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) =>
            <tr key={item.level} className={cx(styles.r_b950dda2, styles.r_358505cf)}>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_0e65706b, styles.r_02eb621e)}>Lv.{item.level}</td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <Input
                  value={item.name}
                  onChange={(e) => updateItem(item.level, { name: e.target.value })}
                  className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee, styles.r_df37b1fd, styles.r_1bd19725)} />

                </td>
                <td className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                  <Input
                  type="number"
                  min={0}
                  value={item.expRequired}
                  disabled={item.level === 1}
                  onChange={(e) =>
                  updateItem(item.level, {
                    expRequired: Math.max(0, Number(e.target.value) || 0)
                  })
                  }
                  className={cx(styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_d5eab218, styles.r_ec0091ee, styles.r_df37b1fd, styles.r_1bd19725, styles.r_37f9fb2e, styles.r_ef460f6b)} />

                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Textarea
        className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_df37b1fd, styles.r_1bd19725)}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注原因(可选)" />

      <button type="button" className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_dd702538)} disabled={busy} onClick={save}>
        {busy ? '保存中...' : '保存等级经验配置'}
      </button>
    </section>);

}
