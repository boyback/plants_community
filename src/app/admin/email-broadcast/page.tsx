/**
 * Admin · 邮件群发管理
 *   - 列表(各任务状态)
 *   - 创建新任务(节日预设 / 自定义 HTML)
 *   - 启动 / 暂停 / 继续 / 删除
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
      const r = await fetch("/api/admin/email-broadcast");
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
      preset === 'custom' ?
      { preset: 'custom', subject, html, throttleMs, filter: {} } :
      { preset, throttleMs, filter: {} };
      const r = await fetch("/api/admin/email-broadcast", {
        method: 'POST',
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data?.error?.message || '创建失败');
        return;
      }
      toast.success(`已创建,共 ${data.data.total} 个收件人。请到列表点「启动」`);
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
    action === 'delete' ?
    await fetch(url, { method: 'DELETE' }) :
    await fetch(url, {
      method: 'PATCH',
      headers: { "Content-Type": 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await r.json();
    if (!r.ok) {
      toast.error(data?.error?.message || '操作失败');
      return;
    }
    load();
  };

  return (
    <div className={styles.r_0478c89a}>
      <div className={cx(styles.r_b6777c6d, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>📧 邮件群发</h1>
        <button onClick={() => setShowCreate(!showCreate)} className={styles.r_4f43b5cb}>
          {showCreate ? '取消' : '+ 新建任务'}
        </button>
      </div>

      {showCreate &&
      <div className={cx(styles.r_b6777c6d, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_9ac94195, styles.r_8e63407b)}>
          <h2 className={cx(styles.r_1bb88326, styles.r_fc7473ca, styles.r_e83a7042)}>新建群发任务</h2>
          <div className={styles.r_6ed543e2}>
            <div>
              <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2)}>模板</label>
              <select
              className="input"
              value={preset}
              onChange={(e) => setPreset(e.target.value as typeof preset)}>

                <option value="custom">自定义内容</option>
                <option value="spring">🎊 春节预设</option>
                <option value="midautumn">🌕 中秋预设</option>
              </select>
            </div>
            {preset === 'custom' &&
          <>
                <div>
                  <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2)}>主题</label>
                  <input
                className="input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="邮件主题" />

                </div>
                <div>
                  <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2)}>HTML 内容</label>
                  <textarea
                className={cx(styles.r_7ee36c26, styles.r_0e65706b, styles.r_359090c2)}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                placeholder="<p>邮件正文 HTML...</p>" />

                </div>
              </>
          }
            <div>
              <label className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_359090c2)}>节流间隔(毫秒,免费版 SMTP 建议 4000-7000)</label>
              <input
              type="number"
              className="input"
              value={throttleMs}
              onChange={(e) => setThrottleMs(Number(e.target.value))}
              min={1000}
              max={60000} />

            </div>
            <button
            onClick={onCreate}
            disabled={creating || preset === 'custom' && (!subject || !html)}
            className={cx(styles.r_4f43b5cb, styles.r_5f533b3a, styles.r_b29d8adb)}>

              {creating ? '创建中…' : '创建任务'}
            </button>
            <p className={cx(styles.r_d058ca6d, styles.r_6c4cc49e)}>
              💡 创建后默认 draft 状态,需要点「启动」才发送。所有有邮箱且未取消订阅的用户会收到。
            </p>
          </div>
        </div>
      }

      {loading ?
      <div className={cx(styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中…</div> :
      items.length === 0 ?
      <div className={cx(styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>
          还没有群发任务。点上方「新建任务」开始。
        </div> :

      <div className={styles.r_6ed543e2}>
          {items.map((b) =>
        <BroadcastRow key={b.id} broadcast={b} onAction={action} />
        )}
        </div>
      }
    </div>);

}

function BroadcastRow({
  broadcast,
  onAction



}: {broadcast: Broadcast;onAction: (id: string, action: 'start' | 'pause' | 'resume' | 'delete') => void;}) {
  const b = broadcast;
  const progress = b.total > 0 ? Math.round((b.sent + b.failed) / b.total * 100) : 0;
  return (
    <div className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_8e63407b)}>
      <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_77a2a20e)}>
        <div>
          <div className={cx(styles.r_fc7473ca, styles.r_2689f395)}>{b.subject}</div>
          <div className={cx(styles.r_15e1b1f4, styles.r_d058ca6d, styles.r_6c4cc49e)}>
            创建于 {new Date(b.createdAt).toLocaleString("zh-CN")}
            {b.startedAt && ` · 开始 ${new Date(b.startedAt).toLocaleString("zh-CN")}`}
            {b.completedAt && ` · 完成 ${new Date(b.completedAt).toLocaleString("zh-CN")}`}
          </div>
        </div>
        <StatusBadge status={b.status} />
      </div>

      <div className={cx(styles.r_a77ed4d9, styles.r_359090c2)}>
        总 {b.total} · ✓ {b.sent} · ✗ {b.failed} ({progress}%)
        <div className={cx(styles.r_b6b02c0e, styles.r_095acb27, styles.r_6da6a3c3, styles.r_ac204c10, styles.r_f2b23104)}>
          <div
            className={cx(styles.r_668b21aa, styles.r_ac204c10, styles.r_45499621, styles.r_0fe7d7d8)}
            style={{ width: `${progress}%` }} />

        </div>
      </div>

      {b.lastError &&
      <div className={cx(styles.r_a77ed4d9, styles.r_07389a77, styles.r_0759a0f1, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_b54428d1)}>
          最近错误: {b.lastError}
        </div>
      }

      <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
        {b.status === 'draft' &&
        <button onClick={() => onAction(b.id, 'start')} className={cx(styles.r_dd702538, styles.r_23b4e5ed, styles.r_ebb407e8)}>
            ▶ 启动
          </button>
        }
        {b.status === 'sending' &&
        <button onClick={() => onAction(b.id, 'pause')} className={cx(styles.r_dd702538, styles.r_23b4e5ed, styles.r_ebb407e8)}>
            ⏸ 暂停
          </button>
        }
        {b.status === 'paused' &&
        <button onClick={() => onAction(b.id, 'resume')} className={cx(styles.r_dd702538, styles.r_23b4e5ed, styles.r_ebb407e8)}>
            ▶ 继续
          </button>
        }
        {['draft', 'done', 'failed'].includes(b.status) &&
        <button
          onClick={() => onAction(b.id, 'delete')}
          className={cx(styles.r_359090c2, styles.r_595fceba, styles.r_f673f4a7)}>

            删除
          </button>
        }
      </div>
    </div>);

}

function StatusBadge({ status }: {status: Broadcast['status'];}) {
  const map: Record<Broadcast['status'], {label: string;cls: string;}> = {
    draft: { label: '草稿', cls: cx(styles.r_d260f3e1, styles.r_99878871) },
    sending: { label: '发送中', cls: cx(styles.r_2eb3df8f, styles.r_65b7dd19) },
    paused: { label: '已暂停', cls: cx(styles.r_735dd972, styles.r_85d79ebf) },
    done: { label: '✓ 完成', cls: cx(styles.r_4d8743a5, styles.r_cf2c3db6) },
    failed: { label: '失败', cls: cx(styles.r_e0467cf5, styles.r_b54428d1) }
  };
  const m = map[status];
  return (
    <span className={cx(styles.r_012fbd12, styles.r_ac204c10, styles.r_d5eab218, styles.r_465609a2, styles.r_d058ca6d, styles.r_2689f395, `${m.cls}`)}>
      {m.label}
    </span>);

}