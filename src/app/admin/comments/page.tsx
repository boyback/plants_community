/**
 * Admin · 评论管理
 *  - 全部 / 启用中 / 已删除 三 tab
 *  - 关键词搜索(内容 / 作者名 / handle)
 *  - 行内删除 + 删除原因输入
 *  - 已删除可恢复
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

interface CommentItem {
  id: string;
  content: string;
  contentText: string | null;
  deleted: boolean;
  deleteReason: string | null;
  deletedAt: string | null;
  likes: number;
  createdAt: string;
  postId: string;
  author: {
    id: string;
    name: string;
    handle: string | null;
    avatar: string;
    level: number;
    role: string;
  };
  post: { id: string; title: string };
}

type StatusTab = 'all' | 'active' | 'deleted';

export default function CommentsAdminPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusTab>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        page: String(page),
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api.get<{ items: CommentItem[]; total: number }>(
        `/api/admin/comments?${params}`,
      );
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const onDelete = async (id: string) => {
    const reason = prompt('删除原因(会进操作日志):');
    if (reason === null) return;
    try {
      await api.delete(
        `/api/admin/comments/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`,
      );
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const onRestore = async (id: string) => {
    if (!confirm('恢复这条评论?')) return;
    try {
      await api.post(`/api/admin/comments/${id}/restore`);
      await load();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const TABS: { key: StatusTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'active', label: '正常' },
    { key: 'deleted', label: '已删除' },
  ];

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">💬 评论管理</h1>
        <span className="text-xs text-leaf-700/60">共 {total} 条</span>
      </div>

      {/* tabs */}
      <div className="mb-3 flex gap-1 rounded-full bg-leaf-50 p-0.5 text-xs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={cn(
              'flex-1 rounded-full py-1.5 transition-colors',
              status === t.key
                ? 'bg-white font-medium text-leaf-700 shadow-sm'
                : 'text-ink-700/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          className="input flex-1 !text-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索内容 / 作者名 / handle"
        />
        <button type="submit" className="btn-primary !text-xs">
          搜索
        </button>
      </form>

      {/* 列表 */}
      {loading ? (
        <div className="py-12 text-center text-sm text-leaf-700/60">加载中…</div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-leaf-700/60">没有数据</div>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <div
              key={c.id}
              className={cn(
                'rounded-lg border border-leaf-100 p-3',
                c.deleted && 'bg-rose-50/30 opacity-70',
              )}
            >
              {/* header: 作者 + 元数据 */}
              <div className="mb-2 flex items-center gap-2 text-[11px]">
                <Avatar src={c.author.avatar} alt={c.author.name} size={24} />
                <Link
                  href={`/user/${c.author.id}`}
                  className="font-medium text-ink-800 hover:text-leaf-700"
                >
                  {c.author.name}
                  {c.author.handle && (
                    <span className="ml-1 text-leaf-700/50">@{c.author.handle}</span>
                  )}
                </Link>
                <span className="rounded bg-leaf-50 px-1 text-[10px] text-leaf-700/70">
                  Lv.{c.author.level}
                </span>
                {c.author.role === 'admin' && (
                  <span className="rounded bg-amber-100 px-1 text-[10px] text-amber-700">
                    admin
                  </span>
                )}
                <span className="ml-auto text-leaf-700/50">
                  {new Date(c.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>

              {/* 评论内容(纯文本预览) */}
              <div
                className={cn(
                  'whitespace-pre-wrap text-sm leading-6 text-ink-800',
                  c.deleted && 'line-through',
                )}
              >
                {c.contentText || stripHtml(c.content) || '(空)'}
              </div>

              {/* 删除信息 */}
              {c.deleted && c.deleteReason && (
                <div className="mt-2 rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700">
                  删除原因: {c.deleteReason}
                </div>
              )}

              {/* 所属帖子 + 操作 */}
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <Link
                  href={`/post/${c.postId}`}
                  className="line-clamp-1 text-leaf-700 hover:underline"
                >
                  📄 {c.post.title}
                </Link>
                <div className="flex gap-2">
                  <span className="text-leaf-700/50">♥ {c.likes}</span>
                  {c.deleted ? (
                    <button
                      onClick={() => onRestore(c.id)}
                      className="text-emerald-700 hover:underline"
                    >
                      恢复
                    </button>
                  ) : (
                    <button
                      onClick={() => onDelete(c.id)}
                      className="text-rose-700 hover:underline"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > 50 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn-ghost !px-3 !py-1 disabled:opacity-50"
          >
            ← 上一页
          </button>
          <span className="text-leaf-700/60">
            {page} / {Math.ceil(total / 50)}
          </span>
          <button
            disabled={page >= Math.ceil(total / 50)}
            onClick={() => setPage((p) => p + 1)}
            className="btn-ghost !px-3 !py-1 disabled:opacity-50"
          >
            下一页 →
          </button>
        </div>
      )}
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
