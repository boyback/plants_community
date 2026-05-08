'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { cn } from '@/lib/utils';

interface PrivacyState {
  showFollowing: boolean;
  showFollowers: boolean;
}

export default function PrivacySettingsPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const [privacy, setPrivacy] = useState<PrivacyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(null), 2000);
  };

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
      showToast('✓ 已保存');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '保存失败');
    } finally {
      setSaving(null);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🔒</div>
          <div className="mt-3 text-lg font-semibold">登录后管理隐私设置</div>
          <Link href="/login?redirect=/settings/privacy" className="btn-primary mt-4 inline-flex">
            去登录
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-1.5 text-xs text-leaf-700/70">
          <Link href="/" className="hover:text-leaf-700">首页</Link>
          <Icon name="arrow-right" size={12} />
          <Link href={`/user/${user?.id}`} className="hover:text-leaf-700">
            我的主页
          </Link>
          <Icon name="arrow-right" size={12} />
          <span className="text-ink-700">隐私设置</span>
        </div>

        <div className="mb-4">
          <h1 className="text-2xl font-bold">🔒 隐私设置</h1>
          <p className="text-sm text-leaf-700/70">
            控制其他用户能否看到你的社交关系。你自己始终可以看到完整信息。
          </p>
        </div>

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

            <div className="card p-4 text-[11px] text-leaf-700/70">
              <div className="mb-1 font-medium text-leaf-700">💡 说明</div>
              <ul className="ml-4 list-disc space-y-0.5">
                <li>关闭对应开关后,他人访问你主页的「关注」或「粉丝」Tab 会看到隐私提示</li>
                <li>粉丝数、关注数仍然公开显示,只是具体的人列表会被隐藏</li>
                <li>
                  「我关注的板块」始终仅自己可见,无需单独设置
                </li>
                <li>新注册用户默认两个开关都开启,以促进社区互动</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
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
    <div className="card flex items-center gap-4 p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-leaf-50 text-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink-800">{title}</div>
        <div className="mt-0.5 text-[11px] text-leaf-700/70">{subtitle}</div>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={saving}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-leaf-500' : 'bg-leaf-200',
          saving && 'opacity-60'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
