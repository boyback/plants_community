'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, ApiError } from '@/lib/client-api';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  tint: string;
  orderIdx: number;
  enabled: boolean;
  durationMs: number;
}

const TINT_PRESETS = [
  'from-leaf-700/70',
  'from-leaf-900/70',
  'from-rose-600/60',
  'from-amber-600/60',
  'from-blue-700/60',
  'from-violet-700/60',
  'from-ink-900/60',
  'from-sand-300/60',
];

export function BannerClient({ initial }: { initial: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);

  const refresh = () => router.refresh();

  const remove = async (id: string) => {
    if (!confirm('确认删除该 banner?')) return;
    try {
      await api.delete(`/api/admin/banners/${id}`);
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const toggleEnabled = async (b: Banner) => {
    try {
      await api.patch(`/api/admin/banners/${b.id}`, { enabled: !b.enabled });
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🖼️ 首页 Banner</h1>
          <p className="mt-1 text-xs text-ink-600">
            共 {initial.length} 张 · orderIdx 越小越靠前 · 单张停留可独立配置(0 = 用全站默认 3000ms)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
        >
          + 新建
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {initial.map((b) => (
          <article
            key={b.id}
            className={
              'overflow-hidden rounded-xl border bg-white ' +
              (b.enabled ? 'border-ink-100' : 'border-rose-200 opacity-70')
            }
          >
            <div className="relative aspect-[21/8] bg-ink-50">
              <Image
                src={b.image}
                alt={b.title}
                fill
                className="object-cover"
                unoptimized
              />
              <div className={`absolute inset-0 bg-gradient-to-r to-transparent ${b.tint}`} />
              <div className="absolute inset-0 p-4 text-white">
                <div className="text-xs opacity-90">{b.title}</div>
                <div className="mt-0.5 line-clamp-2 text-[10px] opacity-80">{b.subtitle}</div>
              </div>
              <div className="absolute right-2 top-2 flex gap-1">
                {!b.enabled && (
                  <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">
                    已停用
                  </span>
                )}
                <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-ink-700">
                  #{b.orderIdx}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-ink-100 px-3 py-2 text-xs">
              <div className="text-ink-500">
                停留:{b.durationMs > 0 ? `${b.durationMs}ms` : '默认'}
                {' · '}
                跳转:{b.link}
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(b)}
                  className="rounded border border-ink-200 px-2 py-1 hover:bg-ink-50"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => toggleEnabled(b)}
                  className={
                    b.enabled
                      ? 'rounded border border-ink-200 px-2 py-1 hover:bg-ink-50'
                      : 'rounded bg-leaf-100 px-2 py-1 text-leaf-700 hover:bg-leaf-200'
                  }
                >
                  {b.enabled ? '停用' : '启用'}
                </button>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="rounded bg-rose-100 px-2 py-1 text-rose-700 hover:bg-rose-200"
                >
                  删除
                </button>
              </div>
            </div>
          </article>
        ))}
        {initial.length === 0 && (
          <div className="col-span-full rounded-xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
            还没有 banner,点右上角「+ 新建」开始
          </div>
        )}
      </div>

      {editing && (
        <EditDialog
          banner={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditDialog({
  banner,
  onClose,
  onSaved,
}: {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(banner?.title ?? '');
  const [subtitle, setSubtitle] = useState(banner?.subtitle ?? '');
  const [image, setImage] = useState(banner?.image ?? '');
  const [link, setLink] = useState(banner?.link ?? '/');
  const [tint, setTint] = useState(banner?.tint ?? TINT_PRESETS[0]);
  const [orderIdx, setOrderIdx] = useState(banner?.orderIdx ?? 0);
  const [enabled, setEnabled] = useState(banner?.enabled ?? true);
  const [durationMs, setDurationMs] = useState(banner?.durationMs ?? 0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return setErr('标题必填');
    if (!subtitle.trim()) return setErr('副标题必填');
    if (!image.trim()) return setErr('图片 URL 必填');
    setBusy(true);
    setErr(null);
    try {
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        image: image.trim(),
        link: link.trim() || '/',
        tint,
        orderIdx,
        enabled,
        durationMs,
      };
      if (banner) {
        await api.patch(`/api/admin/banners/${banner.id}`, body);
      } else {
        await api.post('/api/admin/banners', body);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">{banner ? '编辑 Banner' : '新建 Banner'}</h3>

        <div className="space-y-3 text-xs">
          <Field label="标题">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </Field>
          <Field label="副标题">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={500} />
          </Field>
          <Field label="图片 URL">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2 font-mono text-[11px]" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />
          </Field>
          {image && (
            <div className="relative aspect-[21/8] overflow-hidden rounded-lg bg-ink-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
              <div className={`absolute inset-0 bg-gradient-to-r to-transparent ${tint}`} />
            </div>
          )}
          <Field label="跳转链接">
            <input className="w-full rounded-lg border border-ink-200 px-3 py-2" value={link} onChange={(e) => setLink(e.target.value)} placeholder="/board/jingtian" />
          </Field>
          <Field label="遮罩色调(Tailwind class)">
            <div className="flex flex-wrap gap-1.5">
              {TINT_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTint(t)}
                  className={
                    'rounded px-2 py-1 font-mono text-[10px] ' +
                    (tint === t
                      ? 'bg-ink-800 text-white'
                      : 'border border-ink-200 hover:bg-ink-50')
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="排序(越小越前)">
              <input type="number" className="w-full rounded-lg border border-ink-200 px-3 py-2" value={orderIdx} onChange={(e) => setOrderIdx(Number(e.target.value))} />
            </Field>
            <Field label="停留(ms,0=默认 3000)">
              <input type="number" className="w-full rounded-lg border border-ink-200 px-3 py-2" value={durationMs} onChange={(e) => setDurationMs(Number(e.target.value))} min={0} max={60000} step={500} />
            </Field>
            <Field label="启用">
              <label className="inline-flex h-9 items-center gap-2">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                <span>{enabled ? '启用' : '停用'}</span>
              </label>
            </Field>
          </div>
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50">
            取消
          </button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700">
            {busy ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-ink-600">{label}</div>
      {children}
    </label>
  );
}
