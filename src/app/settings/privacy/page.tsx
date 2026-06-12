'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
    api.
    get<PrivacyState>('/api/users/me/privacy').
    then(setPrivacy).
    catch(() => null).
    finally(() => setLoading(false));
  }, [user, authLoading]);

  const toggle = async (field: keyof PrivacyState) => {
    if (!privacy) return;
    setSaving(field);
    try {
      const next = { ...privacy, [field]: !privacy[field] };
      const r = await api.patch<PrivacyState>('/api/users/me/privacy', {
        [field === 'showFollowing' ? 'showFollowing' : 'showFollowers']: next[field]
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
      <div className={cx(styles.r_a4d0f420, styles.r_ca6bf630)}>
        <div className={cx(styles.r_a95699d9, styles.r_1bb88326)}>🔒</div>
        <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>请先登录</div>
      </div>);

  }

  return (
    <div className={styles.r_0478c89a}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_b6777c6d)}>
        <Icon name="lock" size={20} />
        <h1 className={cx(styles.r_d5c9b000, styles.r_e83a7042)}>隐私设置</h1>
      </div>

      <p className={cx(styles.r_fc7473ca, styles.r_b17d6a13, styles.r_da019856)}>
        控制其他用户能否看到你的社交关系。你自己始终可以看到完整信息。
      </p>

      {loading || !privacy ?
      <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div> :

      <div className={styles.r_6ed543e2}>
          <PrivacyRow
          icon="🤝"
          title="公开我的关注列表"
          subtitle="关闭后,他人无法看到你关注了哪些人;自己始终可见"
          checked={privacy.showFollowing}
          onChange={() => toggle('showFollowing')}
          saving={saving === 'showFollowing'} />

          <PrivacyRow
          icon="👥"
          title="公开我的粉丝列表"
          subtitle="关闭后,他人无法看到谁关注了你"
          checked={privacy.showFollowers}
          onChange={() => toggle('showFollowers')}
          saving={saving === 'showFollowers'} />


          <div className={cx(styles.r_0ab86672, styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95, styles.r_7ebecbb6, styles.r_5f22e64f)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>💡 说明</div>
            <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
              <li>关闭对应开关后,他人访问你主页的「关注」或「粉丝」Tab 会看到隐私提示</li>
              <li>粉丝数、关注数仍然公开显示,只是具体的人列表会被隐藏</li>
              <li>「我关注的板块」始终仅自己可见,无需单独设置</li>
              <li>新注册用户默认两个开关都开启,以促进社区互动</li>
            </ul>
          </div>
        </div>
      }
    </div>);

}

function PrivacyRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  saving







}: {icon: string;title: string;subtitle: string;checked: boolean;onChange: () => void;saving: boolean;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_8e63407b)}>
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
        <span className={styles.r_d5c9b000}>{icon}</span>
        <div>
          <div className={cx(styles.r_2689f395, styles.r_399e11a5)}>{title}</div>
          <div className={cx(styles.r_359090c2, styles.r_7b89cd85)}>{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={saving}
        className={cn(cx(styles.r_d89972fe, styles.r_f6fe9024, styles.r_edaba517, styles.r_012fbd12, styles.r_ac204c10, styles.r_ceb69a6b),

        checked ? styles.r_45499621 : styles.r_ee1b532e,
        saving && styles.r_f2868c22
        )}>

        <span
          className={cn(cx(styles.r_da4dbfbc, styles.r_58fcccb7, styles.r_1af92b74, styles.r_cd0d9c51, styles.r_72470489, styles.r_ac204c10, styles.r_5e10cdb8, styles.r_ed9d3d83, styles.r_eadef238),

          checked ? styles.r_3cbbeaaa : styles.r_850292e4
          )} />

      </button>
    </div>);

}