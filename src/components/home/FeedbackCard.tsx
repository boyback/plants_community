/**
 * 首页右栏「反馈」入口卡 + 弹窗
 *
 * - 卡片:一句简介 + 「写反馈」按钮
 * - 弹窗:类别(bug/建议/内容/其他) + 内容
 * - 提交 POST /api/feedback,后端发私信给超级管理员
 */
'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Category = 'bug' | 'feature' | 'content' | 'other';

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'bug', label: '缺陷', icon: '🐛' },
  { key: 'feature', label: '建议', icon: '✨' },
  { key: 'content', label: '内容', icon: '📝' },
  { key: 'other', label: '其他', icon: '💬' },
];

export function FeedbackCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="card overflow-hidden">
        <div className="border-b border-leaf-100/60 px-4 py-2.5">
          <span className="text-sm font-semibold text-ink-800">📮 用户反馈</span>
        </div>
        <div className="p-4">
          <p className="text-[12px] leading-5 text-leaf-700/70">
            发现问题或想法?<br />
            告诉我们,管理员会尽快回复 →
          </p>
          {user ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="btn-primary mt-3 w-full !text-sm"
            >
              写反馈
            </button>
          ) : (
            <Link href="/login" className="btn-ghost mt-3 inline-flex w-full justify-center !text-sm">
              登录后反馈
            </Link>
          )}
        </div>
      </div>

      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<Category>('feature');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setErr(null);
    if (content.trim().length < 5) return setErr('反馈至少 5 个字');
    setSubmitting(true);
    try {
      await api.post('/api/feedback', { content: content.trim(), category });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-leaf-100 px-5 py-3">
          <h3 className="text-base font-semibold text-ink-800">📮 写反馈</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-leaf-700/60 hover:bg-leaf-50"
          >
            ✕
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <div className="text-3xl">✓</div>
            <div className="mt-2 text-sm font-medium text-ink-800">反馈已发送</div>
            <p className="mt-1 text-xs text-leaf-700/60">
              管理员收到后会在私信里回复你
            </p>
            <button onClick={onClose} className="btn-primary mt-4 !text-sm">
              知道了
            </button>
          </div>
        ) : (
          <div className="space-y-3 p-5">
            <div>
              <label className="mb-1.5 block text-xs text-ink-700">类别</label>
              <div className="flex gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      'flex-1 rounded-lg border px-2 py-2 text-xs transition-colors',
                      category === c.key
                        ? 'border-leaf-500 bg-leaf-50 text-leaf-700 font-medium'
                        : 'border-leaf-100 bg-white text-ink-700/80 hover:bg-leaf-50',
                    )}
                  >
                    <div className="text-base">{c.icon}</div>
                    <div className="mt-0.5">{c.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-ink-700">内容</label>
              <textarea
                className="input min-h-[120px] !text-sm"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 2000))}
                placeholder="描述遇到的问题、希望增加的功能,或对内容的建议…"
                maxLength={2000}
              />
              <div className="mt-1 text-right text-[10px] text-leaf-700/40">
                {content.length} / 2000
              </div>
            </div>

            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost flex-1 !text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={submitting || content.trim().length < 5}
                className="btn-primary flex-1 !text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
