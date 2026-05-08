'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ageConfirm, setAgeConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    ageConfirm && agreed && name.trim().length >= 2 && password.length >= 6 && !loading;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!ageConfirm || !agreed) {
      setErr(t('auth.register.mustAccept') || '请先勾选年龄确认与协议同意');
      return;
    }
    if (password !== confirm) {
      setErr(t('auth.register.passwordMismatch') || '两次密码输入不一致');
      return;
    }
    setLoading(true);
    const r = await register(name, password);
    setLoading(false);
    if (!r.ok) {
      setErr(r.msg ?? (t('auth.register.fail') || '注册失败'));
      return;
    }
    router.push('/');
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
          <h1 className="text-2xl font-bold text-ink-800">{t('auth.register.title') || '加入肉友社'} 🌱</h1>
          <p className="mt-1 text-sm text-leaf-700/70">
            {t('auth.register.subtitle') || '开始你的养肉之旅'}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">
                {t('auth.login.name') || '用户名'}
              </label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.register.name') || '取一个好听的昵称'}
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
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-800">
                {t('auth.register.passwordConfirm') || '确认密码'}
              </label>
              <input
                type="password"
                className="input"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t('auth.register.passwordConfirmPlaceholder') || '再输入一次'}
              />
            </div>

            {/* 14 岁确认 */}
            <label className="flex items-start gap-2 text-xs text-leaf-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={ageConfirm}
                onChange={(e) => setAgeConfirm(e.target.checked)}
              />
              <span>{t('auth.register.ageConfirm') || '我已满 14 周岁'}</span>
            </label>

            {/* 协议同意(带富链接) */}
            <label className="flex items-start gap-2 text-xs text-leaf-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <AgreeText t={t} />
            </label>

            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}
            <button
              type="submit"
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
            >
              {loading
                ? t('common.loading') || '加载中…'
                : t('auth.register.submit') || '创建账号'}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-leaf-700/70">
            <Link href="/login" className="link">
              {t('auth.register.toLogin') || '已有账号?去登录'}
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

/** 把「我已阅读并同意 用户协议 与 隐私政策」的插值文案拆成 <Link> 组合 */
function AgreeText({ t }: { t: (k: string, vars?: Record<string, string | number>) => string }) {
  const tpl = t('auth.register.agree'); // "我已阅读并同意 {terms} 与 {privacy}"
  const termsLabel = t('auth.register.terms');
  const privacyLabel = t('auth.register.privacy');

  // 若 key 未命中(返回 'auth.register.agree'),退回纯中文
  if (!tpl || tpl === 'auth.register.agree') {
    return (
      <span>
        我已阅读并同意
        <Link href="/terms" target="_blank" className="link mx-1">用户协议</Link>
        与
        <Link href="/privacy" target="_blank" className="link mx-1">隐私政策</Link>
      </span>
    );
  }
  // 简单插值:以 {terms} / {privacy} 为分隔
  const parts = tpl.split(/\{(terms|privacy)\}/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p === 'terms') {
          return (
            <Link key={i} href="/terms" target="_blank" className="link mx-1">
              {termsLabel}
            </Link>
          );
        }
        if (p === 'privacy') {
          return (
            <Link key={i} href="/privacy" target="_blank" className="link mx-1">
              {privacyLabel}
            </Link>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </span>
  );
}
