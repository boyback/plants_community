'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { UploadField } from '@/components/upload/UploadField';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';

export default function ProfileSettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar);
      setName(user.name);
      setBio(user.bio ?? '');
    }
  }, [user]);

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  const onSave = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (avatar !== user.avatar) payload.avatar = avatar;
      if (name !== user.name) payload.name = name;
      if (bio !== (user.bio ?? '')) payload.bio = bio;
      if (Object.keys(payload).length === 0) {
        showToast('没有修改');
        return;
      }
      await api.patch('/api/users/me/profile', payload);
      await refresh();
      showToast('已保存 ✅');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <Shell>
        <div className="card p-6 text-sm text-leaf-700/70">加载中…</div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 text-xs text-leaf-700/70">
        <Link href="/settings" className="hover:text-leaf-700">
          ← 设置
        </Link>
      </div>

      <div className="card space-y-6 p-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          👤 个人资料
        </h1>

        {/* 头像 */}
        <section>
          <div className="mb-2 text-sm font-medium">头像</div>
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Avatar src={avatar} alt={name} size={80} />
            </div>
            <div className="min-w-0 flex-1">
              <UploadField
                kind="image"
                value={avatar ? [avatar] : []}
                onChange={(arr) => setAvatar(arr[0] ?? '/default-avatar.svg')}
                max={1}
                allowExternal={false}
              />
              <div className="mt-2 text-[11px] text-leaf-700/60">
                建议正方形,大小不超过 10MB,JPG / PNG / WebP / HEIC 均可
              </div>
            </div>
          </div>
        </section>

        {/* 昵称 */}
        <section>
          <label className="block">
            <div className="mb-1 text-sm font-medium">昵称</div>
            <input
              className="input max-w-md"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="2-24 个字符"
            />
            <div className="mt-1 text-[11px] text-leaf-700/60">
              {name.length} / 24
            </div>
          </label>
        </section>

        {/* 简介 */}
        <section>
          <label className="block">
            <div className="mb-1 text-sm font-medium">简介</div>
            <textarea
              className="input min-h-[80px] max-w-md"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              placeholder="一两句介绍自己,留空也行"
            />
            <div className="mt-1 text-[11px] text-leaf-700/60">
              {bio.length} / 200
            </div>
          </label>
        </section>

        <div className="flex gap-2 border-t border-leaf-100 pt-4">
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="btn-primary"
          >
            <Icon name="check" size={14} />
            {busy ? '保存中…' : '保存'}
          </button>
          <Link href="/settings" className="btn-outline">
            取消
          </Link>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}
