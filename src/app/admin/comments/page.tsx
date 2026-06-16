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
import { api } from "@/lib/client-api";
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



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
  post: {id: string;title: string;};
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
        page: String(page)
      });
      if (q.trim()) params.set('q', q.trim());
      const data = await api.get<{items: CommentItem[];total: number;}>(
        `/api/admin/comments?${params}`
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
    const reason = prompt("删除原因(会进操作日志):");
    if (reason === null) return;
    try {
      await api.delete(
        `/api/admin/comments/${id}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
      );
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onRestore = async (id: string) => {
    if (!confirm('恢复这条评论?')) return;
    try {
      await api.post(`/api/admin/comments/${id}/restore`);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const TABS: {key: StatusTab;label: string;}[] = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '正常' },
  { key: 'deleted', label: '已删除' }];


  return (
    <div className={styles.r_0478c89a}>
      <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>💬 评论管理</h1>
        <span className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>共 {total} 条</span>
      </div>

      {/* tabs */}
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_7ebecbb6, styles.r_de8350a3, styles.r_359090c2)}>
        {TABS.map((t) =>
        <button
          key={t.key}
          onClick={() => {
            setStatus(t.key);
            setPage(1);
          }}
          className={cn(cx(styles.r_36e579c0, styles.r_ac204c10, styles.r_ec0091ee, styles.r_ceb69a6b),

          status === t.key ? cx(styles.r_5e10cdb8, styles.r_2689f395, styles.r_5f6a59f1, styles.r_438b2237) : styles.r_5fa66415


          )}>

            {t.label}
          </button>
        )}
      </div>

      {/* 搜索 */}
      <form onSubmit={onSearch} className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_77a2a20e)}>
        <Input
          className={cx(styles.r_36e579c0, styles.r_dd702538)}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索内容 / 作者名 / handle" />

        <button type="submit" className={styles.r_dd702538}>
          搜索
        </button>
      </form>

      {/* 列表 */}
      {loading ?
      <div className={cx(styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中…</div> :
      items.length === 0 ?
      <div className={cx(styles.r_61357c0c, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>没有数据</div> :

      <div className={styles.r_6ed543e2}>
          {items.map((c) =>
        <div
          key={c.id}
          className={cn(cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_eb6e8b88),

          c.deleted && cx(styles.r_fdae7b46, styles.r_0c67ca47)
          )}>

              {/* header: 作者 + 元数据 */}
              <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
                <Avatar src={c.author.avatar} alt={c.author.name} size={24} />
                <Link
              href={`/user/${c.author.id}`}
              className={cx(styles.r_2689f395, styles.r_399e11a5, styles.r_9825203a)}>

                  {c.author.name}
                  {c.author.handle &&
              <span className={cx(styles.r_f58b0257, styles.r_3353f144)}>@{c.author.handle}</span>
              }
                </Link>
                <span className={cx(styles.r_07389a77, styles.r_7ebecbb6, styles.r_d8e0e382, styles.r_1dc571a3, styles.r_69335b95)}>
                  Lv.{c.author.level}
                </span>
                {c.author.role === 'admin' &&
            <span className={cx(styles.r_07389a77, styles.r_735dd972, styles.r_d8e0e382, styles.r_1dc571a3, styles.r_85d79ebf)}>
                    admin
                  </span>
            }
                <span className={cx(styles.r_fb56d9cf, styles.r_3353f144)}>
                  {new Date(c.createdAt).toLocaleString("zh-CN")}
                </span>
              </div>

              {/* 评论内容(纯文本预览) */}
              <div
            className={cn(cx(styles.r_a2edcb1a, styles.r_fc7473ca, styles.r_18550d59, styles.r_399e11a5),

            c.deleted && styles.r_093ca562
            )}>

                {c.contentText || stripHtml(c.content) || '(空)'}
              </div>

              {/* 删除信息 */}
              {c.deleted && c.deleteReason &&
          <div className={cx(styles.r_50d0d216, styles.r_07389a77, styles.r_0759a0f1, styles.r_d5eab218, styles.r_660d2eff, styles.r_d058ca6d, styles.r_b54428d1)}>
                  删除原因: {c.deleteReason}
                </div>
          }

              {/* 所属帖子 + 操作 */}
              <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d)}>
                <Link
              href={`/post/${c.postId}`}
              className={cx(styles.r_f50e2015, styles.r_5f6a59f1, styles.r_f673f4a7)}>

                  📄 {c.post.title}
                </Link>
                <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                  <span className={styles.r_3353f144}>♥ {c.likes}</span>
                  {c.deleted ?
              <button
                onClick={() => onRestore(c.id)}
                className={cx(styles.r_cf2c3db6, styles.r_f673f4a7)}>

                      恢复
                    </button> :

              <button
                onClick={() => onDelete(c.id)}
                className={cx(styles.r_b54428d1, styles.r_f673f4a7)}>

                      删除
                    </button>
              }
                </div>
              </div>
            </div>
        )}
        </div>
      }

      {/* 分页 */}
      {total > 50 &&
      <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_359090c2)}>
          <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
          className={cx(styles.r_23b4e5ed, styles.r_ebb407e8, styles.r_b29d8adb)}>

            ← 上一页
          </button>
          <span className={styles.r_6c4cc49e}>
            {page} / {Math.ceil(total / 50)}
          </span>
          <button
          disabled={page >= Math.ceil(total / 50)}
          onClick={() => setPage((p) => p + 1)}
          className={cx(styles.r_23b4e5ed, styles.r_ebb407e8, styles.r_b29d8adb)}>

            下一页 →
          </button>
        </div>
      }
    </div>);

}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
