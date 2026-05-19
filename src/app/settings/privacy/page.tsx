'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

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
        [field === 'showFollowing' ? 'showFollowing' : 'showFollowers']: next[field],
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
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-lg font-semibold">请先登录</div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-6">
        <Icon name="lock" size={20} />
        <h1 className="text-xl font-semibold">隐私设置</h1>
      </div>

      <p className="text-sm text-leaf-600 mb-4">
        控制其他用户能否看到你的社交关系。你自己始终可以看到完整信息。
      </p>

      {loading || !privacy ? (
        <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>
      ) : (
        <div className="space-y-3">
          <PrivacyRow
            icon="🤝"
            title="公开我的关注列表"
            subtitle="关闭后,他人无法看到你关注了哪些人;自己始终可见"
            checked={privacy.showFollowing}
            onChange={() => toggle('showFollowing')}
            saving={saving === 'showFollowing'}
          />
          <PrivacyRow
            icon="👥"
            title="公开我的粉丝列表"
            subtitle="关闭后,他人无法看到谁关注了你"
            checked={privacy.showFollowers}
            onChange={() => toggle('showFollowers')}
            saving={saving === 'showFollowers'}
          />

          <div className="mt-4 p-4 text-[11px] text-leaf-700/70 bg-leaf-50 rounded-lg">
            <div className="mb-1 font-medium text-leaf-700">💡 说明</div>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>关闭对应开关后,他人访问你主页的「关注」或「粉丝」Tab 会看到隐私提示</li>
              <li>粉丝数、关注数仍然公开显示,只是具体的人列表会被隐藏</li>
              <li>「我关注的板块」始终仅自己可见,无需单独设置</li>
              <li>新注册用户默认两个开关都开启,以促进社区互动</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacyRow({
  icon,
  title,
  subtitle,
  checked,
  onChange,
  saving,
}: {
  icon: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-leaf-100 p-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <div className="font-medium text-ink-800">{title}</div>
          <div className="text-xs text-ink-500">{subtitle}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={saving}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-leaf-500' : 'bg-ink-200',
          saving && 'opacity-60'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}
