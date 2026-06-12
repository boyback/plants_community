'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';
import { AvatarField } from '@/components/upload/AvatarField';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
      <div className={cx(styles.r_0478c89a, styles.r_fc7473ca, styles.r_69335b95)}>加载中…</div>);

  }

  return (
    <div className={cx(styles.r_b3542e05, styles.r_0478c89a)}>
        <h1 className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d5c9b000, styles.r_e83a7042)}>
          👤 个人资料
        </h1>

        {/* 头像 */}
        <section>
          <div className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_2689f395)}>头像</div>
          <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_0c3bc985)}>
            <AvatarField
            value={avatar}
            onChange={setAvatar}
            alt={name}
            size={96} />

            <div className={cx(styles.r_d058ca6d, styles.r_7054e276, styles.r_69335b95)}>
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
          <label className={styles.r_0214b4b3}>
            <div className={cx(styles.r_65281709, styles.r_fc7473ca, styles.r_2689f395)}>昵称</div>
            <input
            className={styles.r_9794ab45}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="2-24 个字符" />

            <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
              {name.length} / 24
            </div>
          </label>
        </section>

        {/* 简介 */}
        <section>
          <label className={styles.r_0214b4b3}>
            <div className={cx(styles.r_65281709, styles.r_fc7473ca, styles.r_2689f395)}>简介</div>
            <textarea
            className={cx(styles.r_dd9ce2a7, styles.r_9794ab45)}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            placeholder="一两句介绍自己,留空也行" />

            <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
              {bio.length} / 200
            </div>
          </label>
        </section>

        <div className={cx(styles.r_60fbb771, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
          <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="btn-primary">

            <Icon name="check" size={14} />
            {busy ? '保存中…' : '保存'}
          </button>
          <Link href="/settings" className="btn-outline">
            取消
          </Link>
        </div>
      </div>);

}