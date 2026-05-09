'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, Suspense, useEffect } from 'react';
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

  // 微信登录可用性 + 当前是否在微信内
  const [wxStatus, setWxStatus] = useState<{ web: boolean; mp: boolean } | null>(null);
  const [inWechat, setInWechat] = useState(false);

  useEffect(() => {
    setInWechat(/micromessenger/i.test(navigator.userAgent));
    fetch('/api/auth/wechat/status')
      .then((r) => r.json())
      .then(setWxStatus)
      .catch(() => null);
  }, []);

  // URL 中 ?error=wx_xx 提示
  useEffect(() => {
    const errCode = searchParams.get('error');
    if (errCode?.startsWith('wx_')) {
      setErr(t('auth.login.wxError') || '微信登录失败,请重试');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const returnTo = searchParams.get('redirect') ?? '/';
  // 微信内优先用 H5 (mp);否则用 PC 扫码 (web)
  const wxLoginHref = inWechat && wxStatus?.mp
    ? `/api/auth/wechat/h5?returnTo=${encodeURIComponent(returnTo)}`
    : wxStatus?.web
      ? `/api/auth/wechat/qrcode?returnTo=${encodeURIComponent(returnTo)}`
      : null;

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

          {/* 微信一键登录 */}
          {wxLoginHref && (
            <>
              <div className="my-4 flex items-center gap-3 text-[11px] text-leaf-700/50">
                <div className="h-px flex-1 bg-leaf-100" />
                <span>{t('auth.login.or') || '或'}</span>
                <div className="h-px flex-1 bg-leaf-100" />
              </div>
              <a
                href={wxLoginHref}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500 bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M9.5 4C5.36 4 2 6.91 2 10.5c0 2.07 1.13 3.91 2.88 5.12L4 18l2.5-1.32c.95.21 1.96.32 3 .32.34 0 .67-.01 1-.04-.13-.5-.2-1.02-.2-1.56 0-3.59 3.36-6.5 7.5-6.5.27 0 .54.01.8.04C18.1 5.95 14.18 4 9.5 4zM7 9a1 1 0 110-2 1 1 0 010 2zm5 0a1 1 0 110-2 1 1 0 010 2z" />
                  <path d="M22 14.5C22 11.46 18.87 9 15 9s-7 2.46-7 5.5c0 1.83 1.13 3.45 2.86 4.45L10 21l2.06-1.13c.93.21 1.92.31 2.94.31 3.87 0 7-2.46 7-5.18zM13 13a.8.8 0 110-1.6.8.8 0 010 1.6zm4 0a.8.8 0 110-1.6.8.8 0 010 1.6z" />
                </svg>
                {inWechat
                  ? t('auth.login.wxH5') || '微信一键登录'
                  : t('auth.login.wxQr') || '微信扫码登录'}
              </a>
            </>
          )}

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
