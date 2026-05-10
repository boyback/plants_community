/**
 * 反馈表单 — /feedback 页用
 *
 * 与 FeedbackCard 中的 FeedbackDialog 形式一致,但:
 *   - 不在弹窗里,而是页面主内容
 *   - 排版宽松,带成功/失败状态切换
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

type Category = 'bug' | 'feature' | 'content' | 'other';

const CATEGORIES: { key: Category; label: string; icon: string; hint: string }[] = [
  { key: 'bug', label: '缺陷', icon: '🐛', hint: '页面报错、按钮失效、数据异常' },
  { key: 'feature', label: '建议', icon: '✨', hint: '希望增加或改进的功能' },
  { key: 'content', label: '内容', icon: '📝', hint: '图鉴/词条/文章错误或补充' },
  { key: 'other', label: '其他', icon: '💬', hint: '吐槽、表扬、联系合作' },
];

export function FeedbackForm() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('feature');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl">🔐</div>
        <div className="mt-2 text-sm font-medium text-ink-800">请先登录后再反馈</div>
        <p className="mt-1 text-xs text-leaf-700/60">
          登录后我们才能在私信里回复你
        </p>
        <Link href="/login?redirect=/feedback" className="btn-primary mt-4 inline-flex">
          去登录
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-8 text-center">
        <div className="text-3xl">✓</div>
        <div className="mt-2 text-base font-semibold text-ink-800">反馈已发送</div>
        <p className="mt-1 text-sm text-leaf-700/60">
          管理员收到后会在私信里回复你 — 记得查收 📬
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={() => {
              setDone(false);
              setContent('');
            }}
            className="btn-ghost"
          >
            再写一条
          </button>
          <Link href="/messages" className="btn-primary">
            去看私信
          </Link>
        </div>
      </div>
    );
  }

  const submit = async () => {
    setErr(null);
    if (content.trim().length < 5) return setErr('反馈至少 5 个字');
    setSubmitting(true);
    try {
      await api.post('/api/feedback', { content: content.trim(), category });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '提交失败,请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      {/* 类别 */}
      <div>
        <label className="mb-2 block text-xs font-medium text-ink-700">反馈类别</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={cn(
                'rounded-lg border px-2 py-2.5 text-xs transition-colors',
                category === c.key
                  ? 'border-leaf-500 bg-leaf-50 text-leaf-700'
                  : 'border-leaf-100 bg-white text-ink-700/80 hover:bg-leaf-50',
              )}
              title={c.hint}
            >
              <div className="text-lg">{c.icon}</div>
              <div className="mt-0.5 font-medium">{c.label}</div>
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-leaf-700/50">
          {CATEGORIES.find((c) => c.key === category)?.hint}
        </p>
      </div>

      {/* 内容 */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-ink-700">内容</label>
        <textarea
          className="input min-h-[160px] !text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 2000))}
          placeholder="请尽量描述清楚:在哪个页面 / 做了什么操作 / 遇到了什么 / 你期望什么"
          maxLength={2000}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-leaf-700/50">至少 5 字,最多 2000 字</span>
          <span className="text-[11px] text-leaf-700/40">{content.length} / 2000</span>
        </div>
      </div>

      {err && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || content.trim().length < 5}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? '发送中…' : '发送反馈'}
        </button>
      </div>
    </div>
  );
}
