'use client';

/**
 * 品种打分面板 — 用户对该品种的难度打分。
 *
 * 展示:
 *   - 大字平均分 + 总票数
 *   - 1-5 星交互(已登录用户可打分,hover 预览,点击保存)
 *   - 头像墙(最近打分的 N 位用户)
 *
 * 数据来源:
 *   - SSR 阶段 species.difficulty / ratingSum / ratingCount 给到 props
 *   - 客户端打分操作走 /api/species/:id/rate POST/DELETE
 *   - 头像墙首次进入视口时拉 /api/species/:id/raters?limit=10
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import styles from './SpeciesRatingPanel.module.scss';
import { cx } from '@/lib/style-utils';



interface RaterItem {
  id: string;
  score: number;
  createdAt: string;
  user: {id: string;name: string;avatar: string;level: number;};
}
interface RatersResp {
  avg: number;
  ratingCount: number;
  myScore: number | null;
  items: RaterItem[];
}

export function SpeciesRatingPanel({
  speciesId,
  fallbackAvg // species.difficulty(没人打分时显示这个)



}: {speciesId: string;fallbackAvg: number;}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [data, setData] = useState<RatersResp | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`).
    then(setData).
    catch(() => null);
  }, [speciesId]);

  const avg = data?.avg ?? fallbackAvg;
  const count = data?.ratingCount ?? 0;
  const myScore = data?.myScore ?? null;

  const submit = async (score: number) => {
    if (!user) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await api.post(`/api/species/${speciesId}/rate`, { score });
      // 重拉数据
      const r = await api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`);
      setData(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '打分失败');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm('撤回我的打分?')) return;
    setBusy(true);
    try {
      await api.delete(`/api/species/${speciesId}/rate`);
      const r = await api.get<RatersResp>(`/api/species/${speciesId}/raters?limit=10`);
      setData(r);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  const display = hover ?? myScore ?? Math.round(avg);

  return (
    <div className={styles.r_6ed543e2}>
      <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_1004c0c3)}>
        <div className={cx(styles.r_60fbb771, styles.r_b7012bb2, styles.r_44ee8ba0)}>
          <span className={cx(styles.r_751fb0d1, styles.r_69450ef1, styles.r_47d65ecb)}>{avg.toFixed(1)}</span>
          <span className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>/ 5</span>
        </div>
        <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
          {count > 0 ? `${count} 人参与打分` : '还没有人打分'}
        </div>
      </div>

      {/* 1-5 星交互 */}
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
        <div
          className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0)}
          onMouseLeave={() => setHover(null)}>

          {[1, 2, 3, 4, 5].map((n) =>
          <button
            key={n}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(n)}
            onClick={() => submit(n)}
            className={cn(cx(styles.r_3febee09, styles.r_eadef238, styles.r_7abf679f),

            n <= display ? styles.r_1dd48761 : styles.r_47eb8768,
            busy && styles.r_0b8c506a
            )}
            title={`${n} 星`}>

              {n <= display ? '★' : '☆'}
            </button>
          )}
        </div>
        {myScore !== null &&
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className={cx(styles.r_d058ca6d, styles.r_69335b95, styles.r_c82b67c8, styles.r_744ff542)}>

            撤回我的打分
          </button>
        }
      </div>

      {!user &&
      <div className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
          <Link href={`/login`} className={cx(styles.r_5f6a59f1, styles.r_c82b67c8)}>登录</Link> 后参与打分
        </div>
      }
      {myScore !== null &&
      <div className={cx(styles.r_d058ca6d, styles.r_69335b95)}>
          你打了 <span className={cx(styles.r_47d65ecb, styles.r_2689f395)}>{myScore}</span> 星
        </div>
      }
      {err &&
      <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_b54428d1)}>{err}</div>
      }

      {/* 头像墙 */}
      {data && data.items.length > 0 &&
      <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e)}>
          <div className={cx(styles.r_a77ed4d9, styles.r_d058ca6d, styles.r_69335b95)}>
            最近 {data.items.length} 位打分肉友
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
            {data.items.map((r) =>
          <Link
            key={r.id}
            href={`/user/${r.user.id}`}
            title={`${r.user.name} · ${r.score} 星`}
            className={cx(styles.r_64292b1c, styles.r_d89972fe)}>

                <Avatar src={r.user.avatar} alt={r.user.name} size={32} />
                <span
              className={cx(styles.r_da4dbfbc, styles.r_1b60f5e1, styles.r_c9e05721, styles.r_ac204c10, styles.r_931bc423, styles.r_d8e0e382, styles.r_05ef0977, styles.r_69450ef1, styles.r_72a4c7cd)}
              style={{ minWidth: 14, textAlign: 'center' }}>

                  {r.score}
                </span>
              </Link>
          )}
          </div>
        </div>
      }
    </div>);

}