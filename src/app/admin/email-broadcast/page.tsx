/**
 * Admin · 邮件群发管理
 *   - 列表(各任务状态)
 *   - 创建新任务(节日预设 / 自定义 HTML)
 *   - 启动 / 暂停 / 继续 / 删除
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Broadcast {
  id: string;
  subject: string;
  status: 'draft' | 'sending' | 'done' | 'paused' | 'failed';
  total: number;
  sent: number;
  failed: number;
  throttleMs: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  lastError: string | null;
}

export default function EmailBroadcastPage() {
  const [items, setItems] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // 创建表单
  const [preset, setPreset] = useState<'spring' | 'midautumn' | 'custom'>('custom');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [throttleMs, setThrottleMs] = useState(4000);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/email-broadcast');
      const data = await r.json();
      setItems(data?.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 10000); // 10s 自动刷新
    return () => clearInterval(t);
  }, []);

  const onCreate = async () => {
    setCreating(true);
    try {
      const body =
        preset === 'custom'
          ? { preset: 'custom', subject, html, throttleMs, filter: {} }
          : { preset, throttleMs, filter: {} };
      const r = await fetch('/api/admin/email-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        alert(data?.error?.message || '创建失败');
        return;
      }
      alert(`✓ 已创建,共 ${data.data.total} 个收件人。请到列表点「启动」`);
      setShowCreate(false);
      setSubject('');
      setHtml('');
      load();
    } finally {
      setCreating(false);
    }
  };

  const action = async (id: string, action: 'start' | 'pause' | 'resume' | 'delete') => {
    if (action === 'delete' && !confirm('确定删除?')) return;
    const url = `/api/admin/email-broadcast/${id}`;
    const r =
      action === 'delete'
        ? await fetch(url, { method: 'DELETE' })
        : await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
          });
    const data = await r.json();
    if (!r.ok) {
      alert(data?.error?.message || '操作失败');
      return;
    }
    load();
  };

  return (
    <div className="card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">📧 邮件群发</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary !text-sm">
          {showCreate ? '取消' : '+ 新建任务'}
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-lg border border-leaf-200 bg-leaf-50/50 p-4">
          <h2 className="mb-3 text-sm font-semibold">新建群发任务</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs">模板</label>
              <select
                className="input"
                value={preset}
                onChange={(e) => setPreset(e.target.value as typeof preset)}
              >
                <option value="custom">自定义内容</option>
                <option value="spring">🎊 春节预设</option>
                <option value="midautumn">🌕 中秋预设</option>
              </select>
            </div>
            {preset === 'custom' && (
              <>
                <div>
                  <label className="mb-1 block text-xs">主题</label>
                  <input
                    className="input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="邮件主题"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs">HTML 内容</label>
                  <textarea
                    className="input min-h-[120px] font-mono text-xs"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    placeholder="<p>邮件正文 HTML...</p>"
                  />
                </div>
              </>
            )}
            <div>
              <label className="mb-1 block text-xs">节流间隔(毫秒,免费版 SMTP 建议 4000-7000)</label>
              <input
                type="number"
                className="input"
                value={throttleMs}
                onChange={(e) => setThrottleMs(Number(e.target.value))}
                min={1000}
                max={60000}
              />
            </div>
            <button
              onClick={onCreate}
              disabled={creating || (preset === 'custom' && (!subject || !html))}
              className="btn-primary !text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? '创建中…' : '创建任务'}
            </button>
            <p className="text-[11px] text-leaf-700/60">
              💡 创建后默认 draft 状态,需要点「启动」才发送。所有有邮箱且未取消订阅的用户会收到。
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-sm text-leaf-700/60">加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-leaf-700/60">
          还没有群发任务。点上方「新建任务」开始。
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <BroadcastRow key={b.id} broadcast={b} onAction={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastRow({
  broadcast,
  onAction,
}: {
  broadcast: Broadcast;
  onAction: (id: string, action: 'start' | 'pause' | 'resume' | 'delete') => void;
}) {
  const b = broadcast;
  const progress = b.total > 0 ? Math.round(((b.sent + b.failed) / b.total) * 100) : 0;
  return (
    <div className="rounded-lg border border-leaf-100 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{b.subject}</div>
          <div className="mt-0.5 text-[11px] text-leaf-700/60">
            创建于 {new Date(b.createdAt).toLocaleString('zh-CN')}
            {b.startedAt && ` · 开始 ${new Date(b.startedAt).toLocaleString('zh-CN')}`}
            {b.completedAt && ` · 完成 ${new Date(b.completedAt).toLocaleString('zh-CN')}`}
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className="mb-2 text-xs">
        总 {b.total} · ✓ {b.sent} · ✗ {b.failed} ({progress}%)
        <div className="mt-1 h-1.5 w-full rounded-full bg-leaf-100">
          <div
            className="h-full rounded-full bg-leaf-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {b.lastError && (
        <div className="mb-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
          最近错误: {b.lastError}
        </div>
      )}

      <div className="flex gap-2">
        {b.status === 'draft' && (
          <button onClick={() => onAction(b.id, 'start')} className="btn-primary !text-xs !px-3 !py-1">
            ▶ 启动
          </button>
        )}
        {b.status === 'sending' && (
          <button onClick={() => onAction(b.id, 'pause')} className="btn-ghost !text-xs !px-3 !py-1">
            ⏸ 暂停
          </button>
        )}
        {b.status === 'paused' && (
          <button onClick={() => onAction(b.id, 'resume')} className="btn-primary !text-xs !px-3 !py-1">
            ▶ 继续
          </button>
        )}
        {['draft', 'done', 'failed'].includes(b.status) && (
          <button
            onClick={() => onAction(b.id, 'delete')}
            className="text-xs text-rose-600 hover:underline"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Broadcast['status'] }) {
  const map: Record<Broadcast['status'], { label: string; cls: string }> = {
    draft: { label: '草稿', cls: 'bg-gray-100 text-gray-700' },
    sending: { label: '发送中', cls: 'bg-blue-100 text-blue-700' },
    paused: { label: '已暂停', cls: 'bg-amber-100 text-amber-700' },
    done: { label: '✓ 完成', cls: 'bg-emerald-100 text-emerald-700' },
    failed: { label: '失败', cls: 'bg-rose-100 text-rose-700' },
  };
  const m = map[status];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}
