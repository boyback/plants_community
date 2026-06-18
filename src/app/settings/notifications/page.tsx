'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Switch } from '@/components/ui/Switch';
import { SettingsPanel, SettingsRow, SettingsRows } from '@/components/settings/SettingsPanel';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';
import styles from './page.module.scss';

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: IconName;
  tone: 'blue' | 'green' | 'rose' | 'purple' | 'orange' | 'teal';
}

const DEFAULT_SETTINGS: NotificationSetting[] = [
  {
    key: 'like',
    label: '点赞通知',
    description: '有人点赞你的帖子或评论时通知',
    enabled: true,
    icon: 'bell',
    tone: 'blue'
  },
  {
    key: 'comment',
    label: '评论通知',
    description: '有人评论你的帖子时通知',
    enabled: true,
    icon: 'comment',
    tone: 'green'
  },
  {
    key: 'follow',
    label: '关注通知',
    description: '有人关注你时通知',
    enabled: true,
    icon: 'heart',
    tone: 'rose'
  },
  {
    key: 'mention',
    label: '@ 提及通知',
    description: '有人在帖子或评论中 @ 你时通知',
    enabled: true,
    icon: 'message',
    tone: 'purple'
  },
  {
    key: 'system',
    label: '系统通知',
    description: '系统公告、活动通知等',
    enabled: true,
    icon: 'alert',
    tone: 'orange'
  },
  {
    key: 'message',
    label: '私信通知',
    description: '收到新私信时通知',
    enabled: true,
    icon: 'mail',
    tone: 'teal'
  }
];

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSetting[]>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    api
      .get<Record<string, boolean>>('/api/users/me/notification-preferences')
      .then((prefs) => {
        setSettings((prev) =>
          prev.map((s) => ({
            ...s,
            enabled: prefs[s.key] ?? true
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleSetting = (key: string) => {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s)));
    setSaved(false);
  };

  const handleSave = async () => {
    const prefs: Record<string, boolean> = {};
    settings.forEach((s) => {
      prefs[s.key] = s.enabled;
    });
    try {
      await api.patch('/api/users/me/notification-preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  if (!user) {
    return (
      <SettingsPanel icon="lock" title="请先登录">
        <div className={styles.emptyState}>
          <Icon name="lock" size={36} />
          <div>请先登录</div>
        </div>
      </SettingsPanel>
    );
  }

  return (
    <SettingsPanel icon="bell" title="通知" description="管理你在植友圈的各类通知">
      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <>
          <SettingsRows>
            {settings.map((setting) => (
              <SettingsRow
                key={setting.key}
                icon={setting.icon}
                tone={setting.tone}
                title={setting.label}
                description={setting.description}
                action={<Switch checked={setting.enabled} onChange={() => toggleSetting(setting.key)} />}
              />
            ))}
          </SettingsRows>

          <div className={styles.saveBar}>
            <div className={styles.saveCopy}>
              <Icon name="plants" size={26} />
              <div>
                <div className={styles.saveTitle}>不错过任何重要消息</div>
                <div className={styles.saveDesc}>你可以随时开启或关闭以上通知设置</div>
              </div>
            </div>
            <div className={styles.saveActions}>
              {saved && <span className={styles.savedText}>已保存</span>}
              <Button type="button" onClick={handleSave}>
                保存设置
              </Button>
            </div>
          </div>
        </>
      )}
    </SettingsPanel>
  );
}
