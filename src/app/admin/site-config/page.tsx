'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



interface Config {
  photoUploadMinLevel: number;
  photoUploadVipOnly: boolean;
  photoModeration: 'auto' | 'manual';
}

interface PingResult {
  driver: string;
  ok: boolean;
  details?: Record<string, unknown>;
  error?: string;
}

export default function Page() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.
    get<Config>("/api/admin/site-config").
    then(setCfg).
    catch((e) => setErr(e instanceof ApiError ? e.message : '加载失败'));
  }, []);

  const patch = async (next: Partial<Config>) => {
    if (!cfg) return;
    setBusy(true);
    try {
      const r = await api.patch<Config>("/api/admin/site-config", next);
      setCfg(r);
      toast.success('已保存');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_8e63407b, styles.r_fc7473ca, styles.r_b54428d1)}>{err}</div>;
  }
  if (!cfg) {
    return <div className={cx(styles.r_fc7473ca, styles.r_69335b95)}>加载中…</div>;
  }

  return (
    <div className={styles.r_b43b4c08}>
      <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>⚙️ 站点配置</h1>

      <UploadDriverPing />

      <section className={styles.r_c07e54fd}>
        <h2 className={cx(styles.r_da019856, styles.r_4ee73492, styles.r_e83a7042)}>📸 品种现场照</h2>
        <div className={styles.r_b43b4c08}>
          <div>
            <div className={cx(styles.r_65281709, styles.r_fc7473ca, styles.r_2689f395)}>最低上传等级</div>
            <p className={cx(styles.r_a77ed4d9, styles.r_359090c2, styles.r_69335b95)}>
              低于该等级的用户无法上传(VIP 不受限,见下方开关)
            </p>
            <input
              type="number"
              min={1}
              max={10}
              className={styles.r_516b03df}
              value={cfg.photoUploadMinLevel}
              onChange={(e) =>
              setCfg({ ...cfg, photoUploadMinLevel: Number(e.target.value) })
              }
              onBlur={() => patch({ photoUploadMinLevel: cfg.photoUploadMinLevel })}
              disabled={busy} />

          </div>

          <div>
            <label className={cx(styles.r_60fbb771, styles.r_34516836, styles.r_3960ffc2, styles.r_77a2a20e)}>
              <input
                type="checkbox"
                className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_5f66c7c0)}
                checked={cfg.photoUploadVipOnly}
                onChange={(e) => patch({ photoUploadVipOnly: e.target.checked })}
                disabled={busy} />

              <div>
                <div className={cx(styles.r_fc7473ca, styles.r_2689f395)}>仅大会员可上传</div>
                <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
                  开启后无视等级,只有 VIP 才能上传
                </div>
              </div>
            </label>
          </div>

          <div>
            <div className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_2689f395)}>审核模式</div>
            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              {(['auto', 'manual'] as const).map((m) =>
              <button
                key={m}
                type="button"
                onClick={() => patch({ photoModeration: m })}
                className={cx(
                  styles.r_5f22e64f,
                  styles.r_ca6bcd4b,
                  styles.r_f0faeb26,
                  styles.r_03b4dd7f,
                  styles.r_fc7473ca,
                  styles.r_ceb69a6b,
                  cfg.photoModeration === m ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_5f6a59f1) : cx(styles.r_691861bc, styles.r_a5c39c39)
                )}
                disabled={busy}>

                  {m === 'auto' ? '✅ 自动通过' : '🕵️ 需要审核'}
                </button>
              )}
            </div>
            <p className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_69335b95)}>
              「需要审核」时,新上传的照片状态为待审核,管理员通过后才显示
            </p>
          </div>
        </div>
      </section>
    </div>);

}

/**
 * 上传 driver 健康检查面板
 */
function UploadDriverPing() {
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState<PingResult | null>(null);

  const ping = async () => {
    setBusy(true);
    try {
      const res = await api.get<PingResult>("/api/admin/upload-driver/ping");
      setR(res);
    } catch (e) {
      setR({
        driver: '?',
        ok: false,
        error: e instanceof ApiError ? e.message : 'ping 失败'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.r_c07e54fd}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h2 className={cx(styles.r_4ee73492, styles.r_e83a7042)}>🛢️ 上传存储 driver</h2>
        <button
          type="button"
          onClick={ping}
          disabled={busy}
          className={styles.r_dd702538}>

          {busy ? '检查中...' : '🩺 健康检查'}
        </button>
      </div>

      <p className={cx(styles.r_1bb88326, styles.r_359090c2, styles.r_69335b95)}>
        当前 driver 由环境变量 <code className={cx(styles.r_07389a77, styles.r_7ebecbb6, styles.r_d8e0e382)}>UPLOAD_DRIVER</code>{' '}
        控制(local/qiniu)。点上面按钮验证配置是否正确 — 它会上传一个 1
        字节测试文件再删掉。
      </p>

      {r &&
      <div
        className={
        r.ok ? cx(styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_eb6e8b88, styles.r_359090c2, styles.r_e7eab4cb) : cx(styles.r_5f22e64f, styles.r_ce772abe, styles.r_eb6e8b88, styles.r_359090c2, styles.r_6699d429)


        }>

          <div className={cx(styles.r_65281709, styles.r_e83a7042)}>
            {r.ok ? '✅' : '❌'} driver = {r.driver}{' '}
            {r.ok ? '工作正常' : '配置异常'}
          </div>
          {r.error &&
        <div className={cx(styles.r_b6b02c0e, styles.r_b54428d1)}>原因:{r.error}</div>
        }
          {r.details &&
        <pre className={cx(styles.r_50d0d216, styles.r_1384f66f, styles.r_07389a77, styles.r_b0b66d88, styles.r_7660b450, styles.r_1dc571a3, styles.r_399e11a5)}>
              {JSON.stringify(r.details, null, 2)}
            </pre>
        }
        </div>
      }
    </section>);

}