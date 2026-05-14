'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/client-api';

interface NotificationSetting {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSetting[]>([
    { key: 'like', label: '点赞通知', description: '有人点赞你的帖子或评论时通知', enabled: true },
    { key: 'comment', label: '评论通知', description: '有人评论你的帖子时通知', enabled: true },
    { key: 'follow', label: '关注通知', description: '有人关注你时通知', enabled: true },
    { key: 'mention', label: '@提及通知', description: '有人在帖子或评论中@你时通知', enabled: true },
    { key: 'system', label: '系统通知', description: '系统公告、活动通知等', enabled: true },
    { key: 'message', label: '私信通知', description: '收到新私信时通知', enabled: true },
  ]);
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
            enabled: prefs[s.key] ?? true,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: !s.enabled } : s))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    const prefs: Record<string, boolean> = {};
    settings.forEach((s) => (prefs[s.key] = s.enabled));
    try {
      await api.patch('/api/users/me/notification-preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  if (!user) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🔔</div>
        <div className="text-lg font-semibold">请先登录</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon name="bell" size={20} />
        <h1 className="text-xl font-semibold">通知</h1>
      </div>

      {loading ? (
        <div className="py-8 text-center text-sm text-leaf-700/60">加载中...</div>
      ) : (
        <>
          <div className="space-y-3">
            {settings.map((setting) => (
              <div
                key={setting.key}
                className="flex items-center justify-between rounded-lg border border-leaf-100 p-4"
              >
                <div>
                  <div className="font-medium text-ink-800">{setting.label}</div>
                  <div className="text-sm text-ink-500">{setting.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting(setting.key)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    setting.enabled ? 'bg-leaf-500' : 'bg-ink-200'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      setting.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-leaf-100 pt-4">
            <div className="text-sm">
              {saved && <span className="text-leaf-600">✓ 已保存</span>}
            </div>
            <button type="button" onClick={handleSave} className="btn-primary">
              保存设置
            </button>
          </div>
        </>
      )}
    </div>
  );
}
