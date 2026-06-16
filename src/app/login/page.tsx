'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState, Suspense, useEffect } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';



export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>);

}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useI18n();

  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URL 中错误码提示
  useEffect(() => {
    const errCode = searchParams.get('error');
    if (errCode === 'need_login') setErr('请先登录');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    // login 函数旧签名是 (name, password),后端已支持 account 字段
    const r = await login(account, password);
    setLoading(false);
    if (!r.ok) {
      setErr(r.msg ?? (t('auth.login.fail') || '账号或密码错误'));
      return;
    }
    const redirect = searchParams.get('redirect') ?? '/';
    router.push(redirect);
    router.refresh();
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

        <Card padding="none" className={styles.r_845f5336}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>
            {t('auth.login.title') || '登录植友圈'} 🌵
          </h1>

          <form onSubmit={onSubmit} className={cx(styles.r_31f25533, styles.r_3e7ce58d)}>
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>账号</label>
              <Input
                className="input"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="账号或邮箱"
                autoComplete="username" />

            </div>
            <div>
              <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>密码</label>
              <Input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete="current-password" />

            </div>
            {err &&
            <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
            }
            <Button
              type="submit"
              fullWidth
              disabled={loading}>

              {loading ? t('common.loading') || '加载中…' : t('auth.login.submit') || '登录'}
            </Button>
          </form>

          <div className={cx(styles.r_0ab86672, styles.r_ca6bf630, styles.r_359090c2, styles.r_69335b95)}>
            <Link href="/register" className="link">
              还没账号?立即注册 →
            </Link>
          </div>
        </Card>

        <Link href="/" className={cx(styles.r_0ab86672, styles.r_ca6bf630, styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>
          ← {t('common.back') || '返回'}
        </Link>
      </div>
    </div>);

}
