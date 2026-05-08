'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: string;
  enabled: boolean;
  startAt: string | null;
  endAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const LEVEL_BADGE: Record<string, string> = {
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-amber-100 text-amber-700',
  important: 'bg-rose-100 text-rose-700',
};

export function AnnouncementClient({ initial }: { initial: Announcement[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);

  const refresh = () => router.refresh();

  const remove = async (id: string) => {
    if (!confirm('确认删除这条公告?')) return;
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '删除失败');
    }
  };

  const toggleEnabled = async (a: Announcement) => {
    try {
      await api.patch(`/api/admin/announcements/${a.id}`, { enabled: !a.enabled });
      refresh();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : '操作失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📣 站内公告</h1>
          <p className="mt-1 text-xs text-ink-600">共 {initial.length} 条</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
        >
          + 新建
        </button>
      </div>

      <div className="space-y-3">
        {initial.map((a) => (
          <article key={a.id} className="rounded-xl border border-ink-100 bg-white p-4">
            <header className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-[10px] ${LEVEL_BADGE[a.level] ?? 'bg-ink-100'}`}>
                {a.level}
              </span>
              <h2 className="text-sm font-semibold text-ink-800">{a.title}</h2>
              {!a.enabled && (
                <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-500">已停用</span>
              )}
              <span className="ml-auto text-[11px] text-ink-500">
                {new Date(a.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </header>
            <p className="whitespace-pre-wrap text-xs text-ink-700">{a.content}</p>
            {(a.startAt || a.endAt) && (
              <div className="mt-2 text-[10px] text-ink-500">
                窗口:{a.startAt ? new Date(a.startAt).toLocaleString('zh-CN') : '—'}
                {' → '}
                {a.endAt ? new Date(a.endAt).toLocaleString('zh-CN') : '长期'}
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 border-t border-ink-100 pt-3 text-xs">
              <button
                type="button"
                onClick={() => setEditing(a)}
                className="rounded border border-ink-200 px-2 py-1 hover:bg-ink-50"
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => toggleEnabled(a)}
                className={a.enabled
                  ? 'rounded border border-ink-200 px-2 py-1 hover:bg-ink-50'
                  : 'rounded bg-leaf-100 px-2 py-1 text-leaf-700 hover:bg-leaf-200'
                }
              >
                {a.enabled ? '停用' : '启用'}
              </button>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="ml-auto rounded bg-rose-100 px-2 py-1 text-rose-700 hover:bg-rose-200"
              >
                删除
              </button>
            </div>
          </article>
        ))}
        {initial.length === 0 && (
          <div className="rounded-xl border border-ink-100 bg-white p-10 text-center text-sm text-ink-500">
            还没有公告,点右上角「+ 新建」开始
          </div>
        )}
      </div>

      {editing && (
        <EditDialog
          announcement={editing === 'new' ? null : editing}
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
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [level, setLevel] = useState(announcement?.level ?? 'info');
  const [enabled, setEnabled] = useState(announcement?.enabled ?? true);
  const [startAt, setStartAt] = useState(
    announcement?.startAt ? toLocal(announcement.startAt) : ''
  );
  const [endAt, setEndAt] = useState(
    announcement?.endAt ? toLocal(announcement.endAt) : ''
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return setErr('标题必填');
    if (!content.trim()) return setErr('内容必填');
    setErr(null);
    setBusy(true);
    try {
      const body = {
        title: title.trim(),
        content: content.trim(),
        level,
        enabled,
        startAt: startAt ? new Date(startAt).toISOString() : undefined,
        endAt: endAt ? new Date(endAt).toISOString() : undefined,
      };
      if (announcement) {
        await api.patch(`/api/admin/announcements/${announcement.id}`, body);
      } else {
        await api.post('/api/admin/announcements', body);
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
        className="card w-full max-w-xl max-h-[90vh] overflow-y-auto bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">
          {announcement ? '编辑公告' : '新建公告'}
        </h3>

        <div className="space-y-3 text-xs">
          <Field label="标题">
            <input
              className="w-full rounded-lg border border-ink-200 px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="内容">
            <textarea
              className="w-full min-h-[120px] rounded-lg border border-ink-200 px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={5000}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="级别">
              <select
                className="w-full rounded-lg border border-ink-200 px-3 py-2"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="info">info(普通)</option>
                <option value="warning">warning(提醒)</option>
                <option value="important">important(重要)</option>
              </select>
            </Field>
            <Field label="启用">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>{enabled ? '立即启用' : '暂停'}</span>
              </label>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="开始时间(可选)">
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-ink-200 px-3 py-2"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </Field>
            <Field label="结束时间(可选)">
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-ink-200 px-3 py-2"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </Field>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink-200 px-3 py-2 text-xs hover:bg-ink-50"
          >
            取消
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={submit}
            className="rounded-lg bg-ink-800 px-3 py-2 text-xs text-white hover:bg-ink-700"
          >
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

function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
