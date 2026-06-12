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
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import styles from './FeedbackForm.module.scss';
import { cx } from '@/lib/style-utils';



type Category = 'bug' | 'feature' | 'content' | 'other';

const CATEGORIES: {key: Category;label: string;icon: string;hint: string;}[] = [
{ key: 'bug', label: '缺陷', icon: '🐛', hint: '页面报错、按钮失效、数据异常' },
{ key: 'feature', label: '建议', icon: '✨', hint: '希望增加或改进的功能' },
{ key: 'content', label: '内容', icon: '📝', hint: '图鉴/词条/文章错误或补充' },
{ key: 'other', label: '其他', icon: '💬', hint: '吐槽、表扬、联系合作' }];


export function FeedbackForm() {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('feature');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) {
    return (
      <div className={cx(styles.r_845f5336, styles.r_ca6bf630)}>
        <div className={styles.r_751fb0d1}>🔐</div>
        <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>请先登录后再反馈</div>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
          登录后我们才能在私信里回复你
        </p>
        <Link href="/login?redirect=/feedback" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
          去登录
        </Link>
      </div>);

  }

  if (done) {
    return (
      <div className={cx(styles.r_845f5336, styles.r_ca6bf630)}>
        <div className={styles.r_751fb0d1}>✓</div>
        <div className={cx(styles.r_50d0d216, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>反馈已发送</div>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_6c4cc49e)}>
          管理员收到后会在私信里回复你 — 记得查收 📬
        </p>
        <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_86843cf1, styles.r_77a2a20e)}>
          <button
            onClick={() => {
              setDone(false);
              setContent('');
            }}
            className="btn-ghost">

            再写一条
          </button>
          <Link href="/messages" className="btn-primary">
            去看私信
          </Link>
        </div>
      </div>);

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
    <div className={cx(styles.r_3e7ce58d, styles.r_c07e54fd)}>
      {/* 类别 */}
      <div>
        <label className={cx(styles.r_a77ed4d9, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>反馈类别</label>
        <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_77a2a20e, styles.r_898c0bcb)}>
          {CATEGORIES.map((c) =>
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={cn(cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_e7ee55ac, styles.r_359090c2, styles.r_ceb69a6b),

            category === c.key ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_5f6a59f1) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_b85c981b, styles.r_5756b7b4)


            )}
            title={c.hint}>

              <div className={styles.r_42536e69}>{c.icon}</div>
              <div className={cx(styles.r_15e1b1f4, styles.r_2689f395)}>{c.label}</div>
            </button>
          )}
        </div>
        <p className={cx(styles.r_aac62f0e, styles.r_d058ca6d, styles.r_3353f144)}>
          {CATEGORIES.find((c) => c.key === category)?.hint}
        </p>
      </div>

      {/* 内容 */}
      <div>
        <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_eb6abb1f)}>内容</label>
        <textarea
          className={cx(styles.r_bc711190, styles.r_4f43b5cb)}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, 2000))}
          placeholder="请尽量描述清楚:在哪个页面 / 做了什么操作 / 遇到了什么 / 你期望什么"
          maxLength={2000} />

        <div className={cx(styles.r_b6b02c0e, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <span className={cx(styles.r_d058ca6d, styles.r_3353f144)}>至少 5 字,最多 2000 字</span>
          <span className={cx(styles.r_d058ca6d, styles.r_4d094717)}>{content.length} / 2000</span>
        </div>
      </div>

      {err &&
      <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
      }

      <div className={cx(styles.r_60fbb771, styles.r_77c08e01)}>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || content.trim().length < 5}
          className={cx(styles.r_5f533b3a, styles.r_b29d8adb)}>

          {submitting ? '发送中…' : '发送反馈'}
        </button>
      </div>
    </div>);

}