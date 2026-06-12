'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { UploadField } from '@/components/upload/UploadField';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function NewAlbumPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (authLoading) {
    return (
      <Shell>
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div>
      </Shell>);

  }

  if (!user) {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>📷</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>请先登录</div>
          <Link href="/login?redirect=/album/new" className={cx(styles.r_0ab86672, styles.r_bb0c4bfc)}>
            登录
          </Link>
        </div>
      </Shell>);

  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErr('请输入相册标题');
      return;
    }
    if (images.length === 0) {
      setErr('请至少上传1张图片');
      return;
    }

    setSubmitting(true);
    setErr(null);

    try {
      const album = await api.post<{id: string;}>('/api/albums', {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
        images
      });

      router.push(`/album/${album.id}`);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className={cx(styles.r_2cc8041e, styles.r_0e12dc7d)}>
        <Link
          href="/shaitu"
          className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_fc7473ca, styles.r_b17d6a13, styles.r_9825203a, styles.r_da019856)}>

          ← 返回晒图广场
        </Link>

        <div className={styles.r_0478c89a}>
          <h1 className={cx(styles.r_d5c9b000, styles.r_69450ef1, styles.r_399e11a5, styles.r_b6777c6d)}>📷 创建相册</h1>

          <div className={styles.r_3e7ce58d}>
            {/* 标题 */}
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f)}>
                相册标题 *
              </label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给相册起个名字"
                maxLength={50} />

              <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_d058ca6d, styles.r_66a36c90)}>
                {title.length}/50
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f)}>
                相册描述
              </label>
              <textarea
                className={styles.r_dd9ce2a7}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这个相册（可选）"
                maxLength={500} />

              <div className={cx(styles.r_b6b02c0e, styles.r_308fc069, styles.r_d058ca6d, styles.r_66a36c90)}>
                {description.length}/500
              </div>
            </div>

            {/* 公开设置 */}
            <div>
              <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_34516836)}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_5f66c7c0)} />

                <span className={cx(styles.r_fc7473ca, styles.r_eb6abb1f)}>公开相册</span>
              </label>
              <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
                公开相册会显示在晒图广场，其他人可以浏览和点赞
              </p>
            </div>

            {/* 图片上传 */}
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f)}>
                上传图片 *（最多100张）
              </label>
              <UploadField
                kind="image"
                value={images}
                onChange={setImages}
                max={100} />

            </div>

            {/* 错误提示 */}
            {err &&
            <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_b54428d1)}>
                {err}
              </div>
            }

            {/* 提交按钮 */}
            <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_1004c0c3, styles.r_173fa8f0, styles.r_b950dda2, styles.r_88b684d2)}>
              <Link href="/shaitu" className="btn-outline">
                取消
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary">

                {submitting ? '创建中...' : '创建相册'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>);

}