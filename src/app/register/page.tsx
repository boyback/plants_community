'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/context/AuthContext';
import { HANDLE_REGEX } from '@/lib/handle';
import { cn } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
    {state: 'idle';} |
    {state: 'checking';} |
    {state: 'ok';} |
    {state: 'taken';reason: string;}>(
    { state: 'idle' });
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
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ email })
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
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({ email, code })
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
        headers: { "Content-Type": 'application/json' },
        body: JSON.stringify({
          email,
          handle,
          password,
          displayName: displayName.trim() || undefined
        })
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
    <div className={cx(styles.r_d89972fe, styles.r_793346c7)}>
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_0917b4a4, styles.r_2cd02d11)}>
        <div className={cx(styles.r_da4dbfbc, styles.r_6115f042, styles.r_d651313d, styles.r_6ab01735, styles.r_d2a5e6cf, styles.r_ac204c10, styles.r_4d592586, styles.r_4b5e775b)} />
        <div className={cx(styles.r_da4dbfbc, styles.r_f9e2ba8d, styles.r_189f036c, styles.r_6ab01735, styles.r_d2a5e6cf, styles.r_ac204c10, styles.r_7a73652f, styles.r_4b5e775b)} />
      </div>

      <div className={cx(styles.r_0e12dc7d, styles.r_60fbb771, styles.r_793346c7, styles.r_9794ab45, styles.r_8dddea07, styles.r_86843cf1, styles.r_f92d0236, styles.r_1100bef6)}>
        <div className={styles.r_b6777c6d}>
          <Logo />
        </div>

        <div className={styles.r_c00bb288}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>加入肉友社 🌱</h1>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_69335b95)}>
            {emailVerified ? '✓ 邮箱已验证 · 设置账号即可注册' : "第 1 步:验证你的邮箱"}
          </p>

          {/* 步骤进度条 */}
          <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_d058ca6d)}>
            <StepDot done={emailVerified} index={1} active={!emailVerified} label="验证邮箱" />
            <div className={cn(cx(styles.r_aea61608, styles.r_36e579c0), emailVerified ? styles.r_45499621 : styles.r_f2b23104)} />
            <StepDot done={false} index={2} active={emailVerified} label="设置账号" />
          </div>

          <form onSubmit={onSubmit} className={styles.r_fb77735e}>
            {/* ====================== Step 1 屏:验证邮箱 ====================== */}
            {!emailVerified &&
            <div className={cx(styles.r_3e7ce58d, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_8e63407b)}>
                <div>
                  <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_399e11a5)}>
                    邮箱 <span className={styles.r_fa512798}>*</span>
                  </label>
                  <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  placeholder="you@example.com"
                  autoComplete="email" />

                </div>

                <div>
                  <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_399e11a5)}>
                    验证码 <span className={styles.r_fa512798}>*</span>
                  </label>
                  <div className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
                    <input
                    className={styles.r_36e579c0}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="6 位验证码"
                    maxLength={6}
                    inputMode="numeric" />

                    <button
                    type="button"
                    onClick={sendCode}
                    disabled={cooldown > 0 || sending || !EMAIL_RE.test(email)}
                    className={cx(styles.r_012fbd12, styles.r_23b4e5ed, styles.r_dd702538, styles.r_5f533b3a, styles.r_b29d8adb)}>

                      {cooldown > 0 ? `${cooldown}s` : sending ? '发送中…' : '获取'}
                    </button>
                  </div>
                  {code.length === 6 &&
                <p className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_85d79ebf)}>
                      ☝️ 输入完成后,点下面「验证邮箱」继续
                    </p>
                }
                </div>

                {err &&
              <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
              }

                <button
                type="button"
                onClick={verifyCode}
                disabled={verifying || code.length !== 6}
                className={cx(styles.r_6da6a3c3, styles.r_5f533b3a, styles.r_b29d8adb)}>

                  {verifying ? '校验中…' : '验证邮箱 →'}
                </button>

                <p className={cx(styles.r_ca6bf630, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                  没收到验证码?查看垃圾邮件,或 60 秒后重新获取
                </p>
              </div>
            }

            {/* ====================== Step 2 屏:设置账号 ====================== */}
            {emailVerified &&
            <div className={styles.r_3e7ce58d}>
                {/* 已验证邮箱提示条 */}
                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_d01e7232, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_cf2c3db6)}>
                  <span className={styles.r_4ee73492}>✓</span>
                  <span className={cx(styles.r_36e579c0, styles.r_f283ea9b)}>已验证 {email}</span>
                </div>

                {/* —— handle —— */}
                <div>
                  <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_399e11a5)}>
                    账号 <span className={styles.r_fa512798}>*</span>
                  </label>
                  <input
                  className="input"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="例如 green_2026"
                  maxLength={20}
                  autoComplete="username"
                  autoFocus />

                  {/* 规则提示(永久显示,让用户提前知道) */}
                  <ul className={cx(styles.r_aac62f0e, styles.r_e2eedc57, styles.r_d058ca6d, styles.r_69335b95)}>
                    <li>· 6-20 位</li>
                    <li>· 必须以字母开头</li>
                    <li>· 只能包含字母、数字、下划线、减号</li>
                    <li className={styles.r_3353f144}>· 登录用,设置后不可修改</li>
                  </ul>
                  {/* 状态行(可用 / 占用 / 检查中) */}
                  <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d)}>
                    {handleStatus.state === 'checking' &&
                  <span className={styles.r_3353f144}>检查中…</span>
                  }
                    {handleStatus.state === 'ok' &&
                  <span className={styles.r_22f3f019}>✓ 可用</span>
                  }
                    {handleStatus.state === 'taken' &&
                  <span className={styles.r_fa512798}>{handleStatus.reason}</span>
                  }
                  </div>
                </div>

                {/* —— 密码 —— */}
                <div>
                  <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_399e11a5)}>
                    密码 <span className={styles.r_fa512798}>*</span>
                  </label>
                  <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  minLength={6}
                  autoComplete="new-password" />

                </div>

                {/* —— 显示名(可选) —— */}
                <div>
                  <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_399e11a5)}>
                    昵称(可选,默认与账号同名)
                  </label>
                  <input
                  className="input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="留空 = 用账号当昵称"
                  maxLength={24} />

                </div>

                {/* Step 2 自己的错误条 + 注册按钮 */}
                {err &&
              <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>
                    {err}
                  </div>
              }

                <button
                type="submit"
                className={cx(styles.r_6da6a3c3, styles.r_5f533b3a, styles.r_b29d8adb)}
                disabled={
                submitting || handleStatus.state !== 'ok' || password.length < 6
                }>

                  {submitting ? '注册中…' : '完成注册'}
                </button>
              </div>
            }
          </form>

          <div className={cx(styles.r_0ab86672, styles.r_ca6bf630, styles.r_359090c2, styles.r_69335b95)}>
            <Link href="/login" className="link">
              已有账号?去登录 →
            </Link>
          </div>
        </div>

        <Link href="/" className={cx(styles.r_0ab86672, styles.r_ca6bf630, styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>
          ← 返回
        </Link>
      </div>
    </div>);

}

function StepDot({
  done,
  index,
  active,
  label





}: {done: boolean;index: number;active: boolean;label: string;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_58284b4e)}>
      <span
        className={cn(cx(styles.r_f3c543ad, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_ac204c10, styles.r_1dc571a3, styles.r_69450ef1, styles.r_ceb69a6b),

        done ? cx(styles.r_1d40adc8, styles.r_72a4c7cd) :

        active ? cx(styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_f2b23104, styles.r_6c4cc49e)


        )}>

        {done ? '✓' : index}
      </span>
      <span
        className={cn(styles.r_d058ca6d,

        done || active ? cx(styles.r_2689f395, styles.r_5f6a59f1) : styles.r_3353f144
        )}>

        {label}
      </span>
    </div>);

}