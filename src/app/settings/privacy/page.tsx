'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { SettingsPanel, SettingsRow, SettingsRows } from '@/components/settings/SettingsPanel';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';

interface PrivacyState {
  showFollowing: boolean;
  showFollowers: boolean;
}

export default function PrivacySettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get<PrivacyState>('/api/users/me/privacy')
      .then(setPrivacy)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const toggle = async (field: keyof PrivacyState) => {
    if (!privacy) return;
    setSaving(field);
    try {
      const next = { ...privacy, [field]: !privacy[field] };
      const r = await api.patch<PrivacyState>('/api/users/me/privacy', {
        [field]: next[field]
      });
      setPrivacy(r);
      await refresh();
      toast.success('已保存');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (!user) {
    return (
      <SettingsPanel icon="lock" title="请先登录">
        <div className={styles.emptyState}>
          <Icon name="lock" size={36} />
          <div>请先登录后管理隐私设置</div>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel
      icon="lock"
      title="隐私设置"
      description="控制其他用户能否看到你的社交关系列表，你自己始终可以查看完整信息。"
    >
      {loading || !privacy ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <>
          <SettingsRows>
            <SettingsRow
              icon="user"
              tone="blue"
              title="公开我的关注列表"
              description="关闭后，其他用户无法看到你关注了哪些人。"
              action={
                <Switch
                  checked={privacy.showFollowing}
                  disabled={saving === 'showFollowing'}
                  onChange={() => toggle('showFollowing')}
                />
              }
            />
            <SettingsRow
              icon="heart"
              tone="rose"
              title="公开我的粉丝列表"
              description="关闭后，其他用户无法看到谁关注了你。"
              action={
                <Switch
                  checked={privacy.showFollowers}
                  disabled={saving === 'showFollowers'}
                  onChange={() => toggle('showFollowers')}
                />
              }
            />
          </SettingsRows>

          <div className={styles.note}>
            <div className={styles.noteTitle}>说明</div>
            <ul>
              <li>关闭对应开关后，其他用户访问你主页的关注或粉丝列表会看到隐私提示。</li>
              <li>粉丝数、关注数仍然公开显示，只有具体用户列表会被隐藏。</li>
              <li>你关注的板块始终仅自己可见，无需单独设置。</li>
            </ul>
          </div>
        </>
      )}
    </SettingsPanel>
  );
}
