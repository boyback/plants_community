'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/client-api';

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
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState('');

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2000);
  };

  useEffect(() => {
    api
      .get<Config>('/api/admin/site-config')
      .then(setCfg)
      .catch((e) => setErr(e instanceof ApiError ? e.message : '加载失败'));
  }, []);

  const patch = async (next: Partial<Config>) => {
    if (!cfg) return;
    setBusy(true);
    try {
      const r = await api.patch<Config>('/api/admin/site-config', next);
      setCfg(r);
      showToast('已保存');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  if (err) {
    return <div className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{err}</div>;
  }
  if (!cfg) {
    return <div className="text-sm text-leaf-700/70">加载中…</div>;
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">⚙️ 站点配置</h1>

      <UploadDriverPing />

      <section className="card p-5">
        <h2 className="mb-4 text-base font-semibold">📸 品种现场照</h2>
        <div className="space-y-5">
          <div>
            <div className="mb-1 text-sm font-medium">最低上传等级</div>
            <p className="mb-2 text-xs text-leaf-700/70">
              低于该等级的用户无法上传(VIP 不受限,见下方开关)
            </p>
            <input
              type="number"
              min={1}
              max={10}
              className="input w-32"
              value={cfg.photoUploadMinLevel}
              onChange={(e) =>
                setCfg({ ...cfg, photoUploadMinLevel: Number(e.target.value) })
              }
              onBlur={() => patch({ photoUploadMinLevel: cfg.photoUploadMinLevel })}
              disabled={busy}
            />
          </div>

          <div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-leaf-500"
                checked={cfg.photoUploadVipOnly}
                onChange={(e) => patch({ photoUploadVipOnly: e.target.checked })}
                disabled={busy}
              />
              <div>
                <div className="text-sm font-medium">仅大会员可上传</div>
                <div className="text-xs text-leaf-700/70">
                  开启后无视等级,只有 VIP 才能上传
                </div>
              </div>
            </label>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">审核模式</div>
            <div className="flex gap-2">
              {(['auto', 'manual'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ photoModeration: m })}
                  className={
                    'rounded-lg border px-4 py-2 text-sm transition-colors ' +
                    (cfg.photoModeration === m
                      ? 'border-leaf-500 bg-leaf-50 text-leaf-700'
                      : 'border-leaf-200 hover:border-leaf-300')
                  }
                  disabled={busy}
                >
                  {m === 'auto' ? '✅ 自动通过' : '🕵️ 需要审核'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-leaf-700/70">
              「需要审核」时,新上传的照片状态为待审核,管理员通过后才显示
            </p>
          </div>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-leaf-900/85 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
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
      const res = await api.get<PingResult>('/api/admin/upload-driver/ping');
      setR(res);
    } catch (e) {
      setR({
        driver: '?',
        ok: false,
        error: e instanceof ApiError ? e.message : 'ping 失败',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">🛢️ 上传存储 driver</h2>
        <button
          type="button"
          onClick={ping}
          disabled={busy}
          className="btn-outline !text-xs"
        >
          {busy ? '检查中...' : '🩺 健康检查'}
        </button>
      </div>

      <p className="mb-3 text-xs text-leaf-700/70">
        当前 driver 由环境变量 <code className="rounded bg-leaf-50 px-1">UPLOAD_DRIVER</code>{' '}
        控制(local/qiniu)。点上面按钮验证配置是否正确 — 它会上传一个 1
        字节测试文件再删掉。
      </p>

      {r && (
        <div
          className={
            r.ok
              ? 'rounded-lg bg-leaf-50/60 p-3 text-xs text-leaf-800'
              : 'rounded-lg bg-rose-50/60 p-3 text-xs text-rose-800'
          }
        >
          <div className="mb-1 font-semibold">
            {r.ok ? '✅' : '❌'} driver = {r.driver}{' '}
            {r.ok ? '工作正常' : '配置异常'}
          </div>
          {r.error && (
            <div className="mt-1 text-rose-700">原因:{r.error}</div>
          )}
          {r.details && (
            <pre className="mt-2 overflow-x-auto rounded bg-white/70 p-2 text-[10px] text-ink-800">
              {JSON.stringify(r.details, null, 2)}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}
