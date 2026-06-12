/**
 * 首页右栏「反馈」入口卡 + 弹窗
 *
 * - 卡片:一句简介 + 「写反馈」按钮
 * - 弹窗:类别(bug/建议/内容/其他) + 内容
 * - 提交 POST /api/feedback,后端发私信给超级管理员
 */
'use client';

import { useState } from 'react';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './FeedbackCard.module.scss';
import { cx } from '@/lib/style-utils';



type Category = 'bug' | 'feature' | 'content' | 'other';

const CATEGORIES: {key: Category;label: string;icon: string;}[] = [
{ key: 'bug', label: '缺陷', icon: '🐛' },
{ key: 'feature', label: '建议', icon: '✨' },
{ key: 'content', label: '内容', icon: '📝' },
{ key: 'other', label: '其他', icon: '💬' }];


export function FeedbackCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={styles.r_2cd02d11}>
        <div className={cx(styles.r_65fdbade, styles.r_38748e06, styles.r_f0faeb26, styles.r_e7ee55ac)}>
          <span className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>📮 用户反馈</span>
        </div>
        <div className={styles.r_8e63407b}>
          <p className={cx(styles.r_69cdf25a, styles.r_7054e276, styles.r_69335b95)}>
            发现问题或想法?<br />
            告诉我们,管理员会尽快回复 →
          </p>
          {user ?
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cx(styles.r_eccd13ef, styles.r_6da6a3c3, styles.r_4f43b5cb)}>

              写反馈
            </button> :

          <Link href="/login" className={cx(styles.r_eccd13ef, styles.r_52083e7d, styles.r_6da6a3c3, styles.r_86843cf1, styles.r_4f43b5cb)}>
              登录后反馈
            </Link>
          }
        </div>
      </div>

      {open && <FeedbackDialog onClose={() => setOpen(false)} />}
    </>);

}

function FeedbackDialog({ onClose }: {onClose: () => void;}) {
  useBodyScrollLock(true);

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
    <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7116b85f, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_8158623f, styles.r_8e63407b, styles.r_1ca6dd1e)}>
      <div className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_0c5e9137, styles.r_5e10cdb8, styles.r_14e46609)}>
        <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_1b2d54a3)}>
          <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>📮 写反馈</h3>
          <button
            type="button"
            onClick={onClose}
            className={cx(styles.r_0c5e9137, styles.r_cd009d7d, styles.r_6c4cc49e, styles.r_5756b7b4)}>

            ✕
          </button>
        </div>

        {done ?
        <div className={cx(styles.r_0478c89a, styles.r_ca6bf630)}>
            <div className={styles.r_751fb0d1}>✓</div>
            <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>反馈已发送</div>
            <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_6c4cc49e)}>
              管理员收到后会在私信里回复你
            </p>
            <button onClick={onClose} className={cx(styles.r_0ab86672, styles.r_4f43b5cb)}>
              知道了
            </button>
          </div> :

        <div className={cx(styles.r_6ed543e2, styles.r_c07e54fd)}>
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_eb6abb1f)}>类别</label>
              <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                {CATEGORIES.map((c) =>
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={cn(cx(styles.r_36e579c0, styles.r_0c5e9137, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_03b4dd7f, styles.r_359090c2, styles.r_ceb69a6b),

                category === c.key ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_5f6a59f1, styles.r_2689f395) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_b85c981b, styles.r_5756b7b4)


                )}>

                    <div className={styles.r_4ee73492}>{c.icon}</div>
                    <div className={styles.r_15e1b1f4}>{c.label}</div>
                  </button>
              )}
              </div>
            </div>

            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_eb6abb1f)}>内容</label>
              <textarea
              className={cx(styles.r_7ee36c26, styles.r_4f43b5cb)}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 2000))}
              placeholder="描述遇到的问题、希望增加的功能,或对内容的建议…"
              maxLength={2000} />

              <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_1dc571a3, styles.r_4d094717)}>
                {content.length} / 2000
              </div>
            </div>

            {err &&
          <div className={cx(styles.r_0c5e9137, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
          }

            <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
              <button
              type="button"
              onClick={onClose}
              className={cx(styles.r_36e579c0, styles.r_4f43b5cb)}>

                取消
              </button>
              <button
              type="button"
              onClick={submit}
              disabled={submitting || content.trim().length < 5}
              className={cx(styles.r_36e579c0, styles.r_4f43b5cb, styles.r_5f533b3a, styles.r_b29d8adb)}>

                {submitting ? '发送中…' : '发送'}
              </button>
            </div>
          </div>
        }
      </div>
    </div>);

}
