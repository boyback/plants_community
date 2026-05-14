'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { UploadField } from '@/components/upload/UploadField';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';

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
        <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">📷</div>
          <div className="mt-3 text-lg font-semibold">请先登录</div>
          <Link href="/login?redirect=/album/new" className="btn-primary mt-4 inline-block">
            登录
          </Link>
        </div>
      </Shell>
    );
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
      const album = await api.post<{ id: string }>('/api/albums', {
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
        images,
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
      <div className="max-w-2xl mx-auto">
        <Link
          href="/shaitu"
          className="inline-flex items-center gap-1 text-sm text-leaf-600 hover:text-leaf-700 mb-4"
        >
          ← 返回晒图广场
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-bold text-ink-800 mb-6">📷 创建相册</h1>

          <div className="space-y-4">
            {/* 标题 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                相册标题 *
              </label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="给相册起个名字"
                maxLength={50}
              />
              <div className="mt-1 text-right text-[11px] text-ink-400">
                {title.length}/50
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                相册描述
              </label>
              <textarea
                className="input min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这个相册（可选）"
                maxLength={500}
              />
              <div className="mt-1 text-right text-[11px] text-ink-400">
                {description.length}/500
              </div>
            </div>

            {/* 公开设置 */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 accent-leaf-500"
                />
                <span className="text-sm text-ink-700">公开相册</span>
              </label>
              <p className="mt-1 text-xs text-ink-500">
                公开相册会显示在晒图广场，其他人可以浏览和点赞
              </p>
            </div>

            {/* 图片上传 */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">
                上传图片 *（最多100张）
              </label>
              <UploadField
                kind="image"
                value={images}
                onChange={setImages}
                max={100}
              />
            </div>

            {/* 错误提示 */}
            {err && (
              <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {err}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-3 pt-4 border-t border-leaf-100">
              <Link href="/shaitu" className="btn-outline">
                取消
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? '创建中...' : '创建相册'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
