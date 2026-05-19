'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AvatarField } from '@/components/upload/AvatarField';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';

export default function ProfileSettingsPage() {
  const { user, loading, refresh } = useAuth();
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatar(user.avatar);
      setName(user.name);
      setBio(user.bio ?? '');
    }
  }, [user]);

  const onSave = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      if (avatar !== user.avatar) payload.avatar = avatar;
      if (name !== user.name) payload.name = name;
      if (bio !== (user.bio ?? '')) payload.bio = bio;
      if (Object.keys(payload).length === 0) {
        toast.success('没有修改');
        return;
      }
      await api.patch('/api/users/me/profile', payload);
      await refresh();
      toast.success('已保存');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="card p-6 text-sm text-leaf-700/70">加载中…</div>
    );
  }

  return (
    <>
      <div className="card space-y-6 p-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold">
          👤 个人资料
        </h1>

        {/* 头像 */}
        <section>
          <div className="mb-2 text-sm font-medium">头像</div>
          <div className="flex items-start gap-4">
            <AvatarField
              value={avatar}
              onChange={setAvatar}
              alt={name}
              size={96}
            />
            <div className="text-[11px] leading-5 text-leaf-700/70">
              点击或拖拽图片到圆框更换头像
              <br />
              建议正方形 · 大小不超过 10MB
              <br />
              支持 JPG / PNG / WebP / GIF / HEIC
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

      </div>
  );
}
