'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, Suspense } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState('多肉阿绿');
  const [password, setPassword] = useState('123456');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await login(name, password);
    setLoading(false);
    if (!r.ok) {
      setErr(r.msg ?? (t('auth.login.fail') || '登录失败'));
      return;
    }
    const redirect = searchParams.get('redirect') ?? '/';
    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-leaf-200/40 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-sand-200/40 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
        <div className="mb-6">
          <Logo />
        </div>

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-ink-800">{t('auth.login.title') || '登录肉友社'} 🌵</h1>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">
                {t('auth.login.name') || '用户名'}
              </label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.login.name') || '输入你的用户名'}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">
                {t('auth.login.password') || '密码'}
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.register.password') || '至少 6 位'}
              />
            </div>
            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}
            <button
              type="submit"
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? t('common.loading') || '加载中…' : t('auth.login.submit') || '登录'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-leaf-700/70">
            <Link href="/register" className="link">
              {t('auth.login.toRegister') || '还没账号?立即注册'}
            </Link>
          </div>

          <div className="mt-6 rounded-lg bg-leaf-50 p-3 text-[11px] text-leaf-700">
            💡 <b>Demo</b> · 建议使用预置用户「多肉阿绿 / 123456」快速体验。
          </div>
        </div>

        <Link href="/" className="mt-4 text-center text-xs text-leaf-700 hover:underline">
          ← {t('common.back') || '返回'}
        </Link>
      </div>
    </div>
  );
}
