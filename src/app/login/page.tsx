'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, Suspense, useEffect, useRef } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

type Tab = 'email' | 'password';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, refresh } = useAuth();
  const { t } = useI18n();

  // 默认 tab:邮箱(无门槛接入,新用户首选);旧用户切到 password
  const [tab, setTab] = useState<Tab>('email');

  // 用户名 + 密码登录
  const [name, setName] = useState('多肉阿绿');
  const [password, setPassword] = useState('123456');

  // 邮箱 + 验证码登录
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0); // 60s 倒计时
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // 微信登录可用性 + 当前是否在微信内
  const [wxStatus, setWxStatus] = useState<{ web: boolean; mp: boolean } | null>(null);
  const [inWechat, setInWechat] = useState(false);

  useEffect(() => {
    setInWechat(/micromessenger/i.test(navigator.userAgent));
    fetch('/api/auth/wechat/status')
      .then((r) => r.json())
      .then(setWxStatus)
      .catch(() => null);
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
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
  const wxLoginHref = inWechat && wxStatus?.mp
    ? `/api/auth/wechat/h5?returnTo=${encodeURIComponent(returnTo)}`
    : wxStatus?.web
      ? `/api/auth/wechat/qrcode?returnTo=${encodeURIComponent(returnTo)}`
      : null;

  const startCooldown = () => {
    setCooldown(60);
    cooldownTimerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const isValidEmail = (s: string) => /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(s);

  const sendEmail = async () => {
    setErr(null);
    if (!isValidEmail(email)) {
      setErr('请输入正确的邮箱地址');
      return;
    }
    setSending(true);
    try {
      const r = await fetch('/api/auth/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.message || '发送失败');
        return;
      }
      startCooldown();
    } finally {
      setSending(false);
    }
  };

  const onSubmitEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!isValidEmail(email)) return setErr('请输入正确的邮箱');
    if (!/^\d{6}$/.test(code)) return setErr('请输入 6 位验证码');
    setLoading(true);
    try {
      const r = await fetch('/api/auth/email/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.message || '登录失败');
        return;
      }
      await refresh();
      router.push(returnTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPwd = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await login(name, password);
    setLoading(false);
    if (!r.ok) {
      setErr(r.msg ?? (t('auth.login.fail') || '登录失败'));
      return;
    }
    router.push(returnTo);
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
          <h1 className="text-2xl font-bold text-ink-800">
            {t('auth.login.title') || '登录肉友社'} 🌵
          </h1>

          {/* Tab 切换:邮箱 / 用户名 */}
          <div className="mt-5 flex gap-1 rounded-full bg-leaf-50 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('email');
                setErr(null);
              }}
              className={cn(
                'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
                tab === 'email' ? 'bg-white text-leaf-700 shadow-sm' : 'text-ink-700/60'
              )}
            >
              ✉️ 邮箱登录
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('password');
                setErr(null);
              }}
              className={cn(
                'flex-1 rounded-full py-2 text-sm font-medium transition-colors',
                tab === 'password' ? 'bg-white text-leaf-700 shadow-sm' : 'text-ink-700/60'
              )}
            >
              🔑 用户名登录
            </button>
          </div>

          {/* 邮箱 + 验证码 表单 */}
          {tab === 'email' && (
            <form onSubmit={onSubmitEmail} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-800">邮箱</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-800">验证码</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 位验证码"
                    maxLength={6}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    onClick={sendEmail}
                    disabled={cooldown > 0 || sending || !isValidEmail(email)}
                    className="btn-ghost shrink-0 !px-4 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cooldown > 0 ? `${cooldown}s` : sending ? '发送中…' : '获取验证码'}
                  </button>
                </div>
              </div>
              {err && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
              )}
              <button
                type="submit"
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? '登录中…' : '登录 / 注册'}
              </button>
              <p className="text-center text-[11px] text-leaf-700/60">
                未注册的邮箱将自动创建账号
              </p>
            </form>
          )}

          {/* 用户名 + 密码 表单 */}
          {tab === 'password' && (
            <form onSubmit={onSubmitPwd} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-800">用户名</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.login.name') || '输入你的用户名'}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-ink-800">密码</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
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
          )}

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
                {inWechat ? '微信一键登录' : '微信扫码登录'}
              </a>
            </>
          )}

          <div className="mt-4 text-center text-xs text-leaf-700/70">
            <Link href="/register" className="link">
              {t('auth.login.toRegister') || '还没账号?立即注册'}
            </Link>
          </div>
        </div>

        <Link href="/" className="mt-4 text-center text-xs text-leaf-700 hover:underline">
          ← {t('common.back') || '返回'}
        </Link>
      </div>
    </div>
  );
}
