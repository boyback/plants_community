'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';

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

const PAGE_SIZE = 50;
const STATUS_OPTIONS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '正常' },
  { key: 'deleted', label: '已删除' },
];

export default function CommentsAdminPage() {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<StatusTab>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = async (nextPage = page, nextStatus = status, nextQ = q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: nextStatus,
        page: String(nextPage),
      });
      if (nextQ.trim()) params.set('q', nextQ.trim());
      const data = await api.get<{ items: CommentItem[]; total: number }>(
        `/api/admin/comments?${params}`
      );
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(page, status, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    void load(1, status, q);
  };

  const onStatusChange = (nextStatus: StatusTab) => {
    setStatus(nextStatus);
    setPage(1);
  };

  const onDelete = async (id: string) => {
    const reason = prompt('删除原因(会进操作日志):');
    if (reason === null) return;
    try {
      await api.delete(
        `/api/admin/comments/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
      );
      toast.success('评论已删除');
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const onRestore = async (id: string) => {
    if (!confirm('恢复这条评论?')) return;
    try {
      await api.post(`/api/admin/comments/${id}/restore`);
      toast.success('评论已恢复');
      await load();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>💬 评论管理</h1>
        <p className={styles.subtitle}>共 {total} 条 · 第 {page}/{totalPages} 页</p>
      </div>

      <form onSubmit={onSearch} className={styles.filterCard}>
        <select
          name="status"
          value={status}
          className={styles.select}
          onChange={(event) => onStatusChange(event.target.value as StatusTab)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>{option.label}</option>
          ))}
        </select>
        <Input
          wrapperClassName={styles.searchWrap}
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="搜索内容 / 作者名 / handle"
        />
        <Button type="submit" size="sm">筛选</Button>
      </form>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>加载中...</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>没有符合的评论</div>
        ) : (
          items.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          ))
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className={styles.pagination}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}>
            上一页
          </Button>
          <span className={styles.pageText}>{page} / {totalPages}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
            下一页
          </Button>
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  onDelete,
  onRestore,
}: {
  comment: CommentItem;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const content = comment.contentText || stripHtml(comment.content) || '(空)';

  return (
    <div className={styles.card}>
      <div className={styles.cardInner}>
        <Avatar src={comment.author.avatar} alt={comment.author.name} size={28} />
        <div className={styles.cardBody}>
          <div className={styles.metaRow}>
            <span className={comment.deleted ? styles.deletedBadge : styles.activeBadge}>
              {comment.deleted ? '已删除' : '正常'}
            </span>
            <Link href={`/user/${comment.author.id}`} className={styles.authorLink}>
              {comment.author.name}
            </Link>
            {comment.author.handle && <span className={styles.muted}>@{comment.author.handle}</span>}
            <span className={styles.levelBadge}>Lv.{comment.author.level}</span>
            {comment.author.role === 'admin' && <span className={styles.adminBadge}>admin</span>}
            <span className={styles.time}>{formatDate(comment.createdAt)}</span>
          </div>

          <div className={comment.deleted ? styles.deletedContent : styles.content}>
            {content}
          </div>

          {comment.deleted && comment.deleteReason && (
            <div className={styles.reasonBox}>删除原因: {comment.deleteReason}</div>
          )}

          <div className={styles.targetBox}>
            <span className={styles.targetLabel}>帖子:</span>
            <Link href={`/post/${comment.postId}`} className={styles.targetLink}>
              {comment.post.title}
            </Link>
            <span className={styles.likes}>♥ {comment.likes}</span>
          </div>
        </div>

        <div className={styles.actions}>
          {comment.deleted ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onRestore(comment.id)}>
              恢复
            </Button>
          ) : (
            <Button type="button" size="sm" variant="danger" onClick={() => onDelete(comment.id)}>
              删除
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}
