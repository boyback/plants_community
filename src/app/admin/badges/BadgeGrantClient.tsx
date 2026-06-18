'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/client-api';
import styles from './BadgeGrantClient.module.scss';
import { cx } from '@/lib/style-utils';

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
  userTotal,
}: {
  badges: BadgeItem[];
  userTotal: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<BadgeItem | null>(null);
  const [userIds, setUserIds] = useState('');
  const [toAll, setToAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const grant = async () => {
    if (!selected) return;
    const ids = userIds
      .split(/\s+|,|;/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!toAll && ids.length === 0) return toast.error('请至少输入一个用户 ID，或勾选“发给全部”');
    if (toAll && !confirm(`确认给全部 ${userTotal} 个用户发放徽章「${selected.name}」？此操作不可撤销。`)) return;
    if (!toAll && !confirm(`给 ${ids.length} 个用户发放徽章「${selected.name}」？`)) return;
    setBusy(true);
    try {
      const r = await api.post<{ granted: number; total: number; badgeName: string }>(
        '/api/admin/badges/grant',
        {
          badgeId: selected.id,
          userIds: toAll ? undefined : ids,
          all: toAll,
        }
      );
      setResult(`已给 ${r.granted}/${r.total} 人发放 ${r.badgeName}`);
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
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>徽章发放</h1>
        <p className={styles.desc}>点击下方徽章卡片选择，然后输入用户 ID 列表发放</p>
      </div>

      <div className={styles.grid}>
        {badges.map((badge) => (
          <Card
            key={badge.id}
            padding="compact"
            interactive
            className={cx(styles.badgeCard, selected?.id === badge.id && styles.badgeCardActive)}
            onClick={() => {
              setSelected(badge);
              setResult(null);
            }}
          >
            <div className={styles.badgeIcon}>{badge.icon}</div>
            <div className={styles.badgeName}>{badge.name}</div>
            <div className={styles.badgeDesc}>{badge.description}</div>
            <div className={styles.badgeCount}>已发 {badge.obtainedCount}</div>
          </Card>
        ))}

        {badges.length === 0 && (
          <Card padding="loose" muted className={styles.emptyCard}>
            没有徽章，请先在后台配置 Badge
          </Card>
        )}
      </div>

      {selected && (
        <Card padding="loose" className={styles.formCard}>
          <h2 className={styles.formTitle}>发放「{selected.icon} {selected.name}」</h2>

          <div className={styles.formBody}>
            <div>
              <label className={styles.label}>用户 ID 列表（空格 / 逗号 / 换行分隔）</label>
              <Textarea
                className={styles.textarea}
                value={userIds}
                onChange={(e) => setUserIds(e.target.value)}
                placeholder="cmojwbr74000czc8wxsx0umvo\ncmojwbr79000dzc8w2nnm2ehu"
                disabled={toAll}
              />
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={toAll}
                onChange={(e) => setToAll(e.target.checked)}
              />
              <span>发给全部 {userTotal} 个用户</span>
            </label>
          </div>

          {result && <div className={styles.result}>{result}</div>}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelected(null);
                setResult(null);
              }}
            >
              取消
            </Button>
            <Button type="button" disabled={busy} onClick={grant}>
              {busy ? '发放中...' : '发放'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
