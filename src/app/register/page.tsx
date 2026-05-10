'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { HANDLE_REGEX } from '@/lib/handle';
import { cn } from '@/lib/utils';

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  // 表单状态
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // handle 异步可用性
  const [handleStatus, setHandleStatus] = useState<
    | { state: 'idle' }
    | { state: 'checking' }
    | { state: 'ok' }
    | { state: 'taken'; reason: string }
  >({ state: 'idle' });
  const handleCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 验证码倒计时
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      if (handleCheckTimerRef.current) clearTimeout(handleCheckTimerRef.current);
    };
  }, []);

  // —————————————————————————— 1. 发送验证码
  const sendCode = async () => {
    setErr(null);
    if (!EMAIL_RE.test(email)) {
      setErr('请输入正确的邮箱');
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
        setErr(data?.error?.message || '发送失败');
        return;
      }
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
    } finally {
      setSending(false);
    }
  };

  // —————————————————————————— 2. 校验验证码
  const verifyCode = async () => {
    setErr(null);
    if (!/^\d{6}$/.test(code)) {
      setErr('请输入 6 位验证码');
      return;
    }
    setVerifying(true);
    try {
      const r = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.error?.message || '验证失败');
        return;
      }
      setEmailVerified(true);
    } finally {
      setVerifying(false);
    }
  };

  // —————————————————————————— 3. handle 实时检查(debounce 500ms)
  useEffect(() => {
    if (handleCheckTimerRef.current) clearTimeout(handleCheckTimerRef.current);
    if (!handle) {
      setHandleStatus({ state: 'idle' });
      return;
    }
    setHandleStatus({ state: 'checking' });
    handleCheckTimerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/handle-available?handle=${encodeURIComponent(handle)}`);
        const data = await r.json();
        if (data.ok) {
          setHandleStatus({ state: 'ok' });
        } else {
          setHandleStatus({ state: 'taken', reason: data.reason || '账号不可用' });
        }
      } catch {
        setHandleStatus({ state: 'idle' });
      }
    }, 500);
  }, [handle]);

  // —————————————————————————— 4. 完成注册
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!emailVerified) return setErr('请先验证邮箱');
    if (!HANDLE_REGEX.test(handle)) return setErr('账号格式不正确');
    if (handleStatus.state !== 'ok') return setErr('账号不可用');
    if (password.length < 6) return setErr('密码至少 6 位');

    setSubmitting(true);
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          handle,
          password,
          displayName: displayName.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setErr(data?.error?.message || '注册失败');
        return;
      }
      // refresh 会重读 /api/auth/me 写入 AuthContext
      await refresh();
      router.push('/');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
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

        <div className="card p-7">
          <h1 className="text-2xl font-bold text-ink-800">加入肉友社 🌱</h1>
          <p className="mt-1 text-xs text-leaf-700/70">
            {emailVerified ? '✓ 邮箱已验证 · 设置账号即可注册' : '第 1 步:验证你的邮箱'}
          </p>

          {/* 步骤进度条 */}
          <div className="mt-4 flex items-center gap-2 text-[11px]">
            <StepDot done={emailVerified} index={1} active={!emailVerified} label="验证邮箱" />
            <div className={cn('h-px flex-1', emailVerified ? 'bg-leaf-500' : 'bg-leaf-100')} />
            <StepDot done={false} index={2} active={emailVerified} label="设置账号" />
          </div>

          <form onSubmit={onSubmit} className="mt-5">
            {/* ====================== Step 1 屏:验证邮箱 ====================== */}
            {!emailVerified && (
              <div className="space-y-4 rounded-xl border border-leaf-100 bg-leaf-50/40 p-4">
                <div>
                  <label className="mb-1.5 block text-xs text-ink-800">
                    邮箱 <span className="text-rose-500">*</span>
                  </label>
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
                  <label className="mb-1.5 block text-xs text-ink-800">
                    验证码 <span className="text-rose-500">*</span>
                  </label>
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
                      onClick={sendCode}
                      disabled={cooldown > 0 || sending || !EMAIL_RE.test(email)}
                      className="btn-ghost shrink-0 !px-3 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cooldown > 0 ? `${cooldown}s` : sending ? '发送中…' : '获取'}
                    </button>
                  </div>
                  {code.length === 6 && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      ☝️ 输入完成后,点下面「验证邮箱」继续
                    </p>
                  )}
                </div>

                {err && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
                )}

                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={verifying || code.length !== 6}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying ? '校验中…' : '验证邮箱 →'}
                </button>

                <p className="text-center text-[11px] text-leaf-700/60">
                  没收到验证码?查看垃圾邮件,或 60 秒后重新获取
                </p>
              </div>
            )}

            {/* ====================== Step 2 屏:设置账号 ====================== */}
            {emailVerified && (
              <div className="space-y-4">
                {/* 已验证邮箱提示条 */}
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <span className="text-base">✓</span>
                  <span className="flex-1 truncate">已验证 {email}</span>
                </div>

                {/* —— handle —— */}
                <div>
                  <label className="mb-1.5 block text-xs text-ink-800">
                    账号 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="input"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value)}
                    placeholder="例如 green_2026"
                    maxLength={20}
                    autoComplete="username"
                    autoFocus
                  />
                  {/* 规则提示(永久显示,让用户提前知道) */}
                  <ul className="mt-1.5 space-y-0.5 text-[11px] text-leaf-700/70">
                    <li>· 6-20 位</li>
                    <li>· 必须以字母开头</li>
                    <li>· 只能包含字母、数字、下划线、减号</li>
                    <li className="text-leaf-700/50">· 登录用,设置后不可修改</li>
                  </ul>
                  {/* 状态行(可用 / 占用 / 检查中) */}
                  <div className="mt-1 text-[11px]">
                    {handleStatus.state === 'checking' && (
                      <span className="text-leaf-700/50">检查中…</span>
                    )}
                    {handleStatus.state === 'ok' && (
                      <span className="text-emerald-600">✓ 可用</span>
                    )}
                    {handleStatus.state === 'taken' && (
                      <span className="text-rose-500">{handleStatus.reason}</span>
                    )}
                  </div>
                </div>

                {/* —— 密码 —— */}
                <div>
                  <label className="mb-1.5 block text-xs text-ink-800">
                    密码 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位"
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                {/* —— 显示名(可选) —— */}
                <div>
                  <label className="mb-1.5 block text-xs text-ink-800">
                    昵称(可选,默认与账号同名)
                  </label>
                  <input
                    className="input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="留空 = 用账号当昵称"
                    maxLength={24}
                  />
                </div>

                {/* Step 2 自己的错误条 + 注册按钮 */}
                {err && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    {err}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    submitting || handleStatus.state !== 'ok' || password.length < 6
                  }
                >
                  {submitting ? '注册中…' : '完成注册'}
                </button>
              </div>
            )}
          </form>

          <div className="mt-4 text-center text-xs text-leaf-700/70">
            <Link href="/login" className="link">
              已有账号?去登录 →
            </Link>
          </div>
        </div>

        <Link href="/" className="mt-4 text-center text-xs text-leaf-700 hover:underline">
          ← 返回
        </Link>
      </div>
    </div>
  );
}

function StepDot({
  done,
  index,
  active,
  label,
}: {
  done: boolean;
  index: number;
  active: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold transition-colors',
          done
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-leaf-500 text-white'
              : 'bg-leaf-100 text-leaf-700/60',
        )}
      >
        {done ? '✓' : index}
      </span>
      <span
        className={cn(
          'text-[11px]',
          done || active ? 'font-medium text-leaf-700' : 'text-leaf-700/50',
        )}
      >
        {label}
      </span>
    </div>
  );
}
