'use client';

import { useEffect, useState } from 'react';
import { AvatarField } from '@/components/upload/AvatarField';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import styles from './page.module.scss';

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
      <SettingsPanel icon="user" title="个人资料">
        <div className={styles.loading}>加载中...</div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel
      icon="user"
      title="个人资料"
      description="更新你的头像、昵称和个人简介，这些信息会展示在个人主页和社区互动中。"
    >
      <div className={styles.form}>
        <section className={styles.avatarSection}>
          <div className={styles.fieldHeader}>
            <div className={styles.fieldTitle}>头像</div>
            <div className={styles.fieldDesc}>建议使用清晰的正方形图片，大小不超过 10MB。</div>
          </div>
          <div className={styles.avatarRow}>
            <AvatarField value={avatar} onChange={setAvatar} alt={name} size={96} />
            <div className={styles.avatarHelp}>
              点击或拖拽图片到头像区域即可更换。
              <br />
              支持 JPG、PNG、WebP、GIF、HEIC。
            </div>
          </div>
        </section>

        <section className={styles.fieldSection}>
          <label className={styles.label} htmlFor="profile-name">
            昵称
          </label>
          <Input
            id="profile-name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="2-24 个字符"
          />
          <div className={styles.count}>{name.length} / 24</div>
        </section>

        <section className={styles.fieldSection}>
          <label className={styles.label} htmlFor="profile-bio">
            简介
          </label>
          <Textarea
            id="profile-bio"
            className={styles.textarea}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            placeholder="用一两句话介绍自己，留空也可以"
          />
          <div className={styles.count}>{bio.length} / 200</div>
        </section>

        <div className={styles.actions}>
          <Button type="button" onClick={onSave} disabled={busy}>
            <Icon name="check" size={14} />
            {busy ? '保存中...' : '保存'}
          </Button>
          <ButtonLink href="/settings" variant="outline">
            取消
          </ButtonLink>
        </div>
      </div>
    </SettingsPanel>
  );
}
