'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api } from "@/lib/client-api";
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
  { key: 'message', label: '私信通知', description: '收到新私信时通知', enabled: true }]
  );
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.
    get<Record<string, boolean>>("/api/users/me/notification-preferences").
    then((prefs) => {
      setSettings((prev) =>
      prev.map((s) => ({
        ...s,
        enabled: prefs[s.key] ?? true
      }))
      );
    }).
    catch(() => {}).
    finally(() => setLoading(false));
  }, [user]);

  const toggleSetting = (key: string) => {
    setSettings((prev) =>
    prev.map((s) => s.key === key ? { ...s, enabled: !s.enabled } : s)
    );
    setSaved(false);
  };

  const handleSave = async () => {
    const prefs: Record<string, boolean> = {};
    settings.forEach((s) => prefs[s.key] = s.enabled);
    try {
      await api.patch("/api/users/me/notification-preferences", prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  if (!user) {
    return (
      <div className={cx(styles.r_a4d0f420, styles.r_ca6bf630)}>
        <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>🔔</div>
        <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>请先登录</div>
      </div>);

  }

  return (
    <div className={styles.r_0478c89a}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_b6777c6d)}>
        <Icon name="bell" size={20} />
        <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>通知</h1>
      </div>

      {loading ?
      <div className={cx(styles.r_a1f611f0, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div> :

      <>
          <div className={styles.r_6ed543e2}>
            {settings.map((setting) =>
          <div
            key={setting.key}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_8e63407b)}>

                <div>
                  <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>{setting.label}</div>
                  <div className={cx(styles.r_fc7473ca, styles.r_7b89cd85)}>{setting.description}</div>
                </div>
                <button
              type="button"
              onClick={() => toggleSetting(setting.key)}
              className={cx(styles.r_d89972fe, styles.r_f6fe9024, styles.r_edaba517, styles.r_ac204c10, styles.r_ceb69a6b, `${
              setting.enabled ? styles.r_45499621 : styles.r_ee1b532e}`)
              }>

                  <span
                className={cx(styles.r_da4dbfbc, styles.r_58fcccb7, styles.r_1af92b74, styles.r_cd0d9c51, styles.r_72470489, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_ed9d3d83, styles.r_eadef238, `${
                setting.enabled ? styles.r_3cbbeaaa : styles.r_850292e4}`)
                } />

                </button>
              </div>
          )}
          </div>

          <div className={cx(styles.r_31f25533, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
            <div className={styles.r_fc7473ca}>
              {saved && <span className={styles.r_b17d6a13}>✓ 已保存</span>}
            </div>
            <button type="button" onClick={handleSave} className="btn-primary">
              保存设置
            </button>
          </div>
        </>
      }
    </div>);

}