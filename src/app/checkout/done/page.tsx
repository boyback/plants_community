'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { PaymentSuccessPanel } from '@/components/payment/PaymentSuccessPanel';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { formatPrice } from '@/lib/utils';
import type { Payment } from '@/lib/types';
import styles from './page.module.scss';

type DoneQuery = {
  payNo: string;
  orderId?: string;
  bizType?: Payment['bizType'];
};

function readDoneQuery(): DoneQuery | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const payNo = search.get('payNo')?.trim() ?? '';
  return {
    payNo,
    orderId: search.get('orderId') ?? search.get('bizId') ?? undefined,
    bizType: (search.get('bizType') as Payment['bizType'] | null) ?? undefined,
  };
}

function getBackHref(payment: Payment | null, query: DoneQuery | null) {
  const bizType = payment?.bizType ?? query?.bizType;
  const orderId = payment?.bizId ?? query?.orderId;
  if (bizType === 'auction_balance' && orderId) return `/checkout/auction/${orderId}`;
  if (bizType === 'order' && orderId) return `/checkout/${orderId}`;
  return '/auction';
}

function getSuccessCopy(payment: Payment) {
  if (payment.bizType === 'auction_balance') {
    return {
      title: '尾款支付成功',
      description: '当前支付单已确认到账,订单进入待发货状态。',
      secondaryHref: '/auction',
      secondaryLabel: '返回拍卖',
    };
  }
  if (payment.bizType === 'deposit') {
    return {
      title: '保证金支付成功',
      description: '当前支付单已确认到账,可以继续参与拍卖。',
      secondaryHref: '/auction',
      secondaryLabel: '返回拍卖',
    };
  }
  return {
    title: '支付成功',
    description: '当前支付单已确认到账,订单状态已更新。',
    secondaryHref: '/market',
    secondaryLabel: '返回交易市场',
  };
}

function StatusCard({
  icon,
  title,
  description,
  tone = 'info',
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  tone?: 'info' | 'warning' | 'error';
  children?: ReactNode;
}) {
  return (
    <Card padding="loose" className={styles.statusCard}>
      <div className={`${styles.iconWrap} ${styles[tone]}`} aria-hidden="true">
        <Icon name={icon} size={28} strokeWidth={2.3} />
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.desc}>{description}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </Card>
  );
}

export default function CheckoutDonePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [query, setQuery] = useState<DoneQuery | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(readDoneQuery());
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user || typeof window === 'undefined') return;
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [authLoading, router, user]);

  useEffect(() => {
    if (authLoading || !user || !query?.payNo) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const check = async () => {
      attempts += 1;
      setChecking(true);
      try {
        const nextPayment = await api.get<Payment>(`/api/payments/${query.payNo}`);
        if (!alive) return;
        setPayment(nextPayment);
        setError(null);
        if (nextPayment.status === 'paid') {
          setChecking(false);
          await refresh();
          return;
        }
        if (nextPayment.status === 'expired' || nextPayment.status === 'cancelled' || nextPayment.status === 'refunded') {
          setChecking(false);
          return;
        }
        if (attempts >= 20) {
          setChecking(false);
          return;
        }
        timer = setTimeout(check, 1500);
      } catch (err) {
        if (!alive) return;
        setChecking(false);
        setError(err instanceof ApiError ? err.message : '支付结果查询失败');
      }
    };

    check();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [authLoading, query?.payNo, refresh, user]);

  const amountText = payment ? `支付金额:${formatPrice(payment.amount)}` : '';

  let content: ReactNode;
  if (!query?.payNo) {
    content = (
      <StatusCard
        icon="info"
        title="支付结果确认中"
        description="如果已经在支付平台完成付款,系统会通过支付渠道通知自动确认订单状态。也可以到我的订单查看最新状态。"
      >
        <ButtonLink href="/orders" size="lg">查看我的订单</ButtonLink>
        <ButtonLink href="/market" variant="outline" size="lg">返回交易市场</ButtonLink>
      </StatusCard>
    );
  } else if (error) {
    content = (
      <StatusCard
        icon="alert"
        title="支付结果查询失败"
        description={error}
        tone="error"
      >
        <ButtonLink href={getBackHref(payment, query)} size="lg">返回支付页</ButtonLink>
        <ButtonLink href="/orders" variant="outline" size="lg">查看我的订单</ButtonLink>
      </StatusCard>
    );
  } else if (payment?.status === 'paid') {
    const copy = getSuccessCopy(payment);
    content = (
      <PaymentSuccessPanel
        title={copy.title}
        description={`${copy.description}${amountText ? ` ${amountText}` : ''}`}
        primaryHref="/orders"
        primaryLabel="查看我的订单"
        secondaryHref={copy.secondaryHref}
        secondaryLabel={copy.secondaryLabel}
      />
    );
  } else if (payment?.status === 'expired' || payment?.status === 'cancelled' || payment?.status === 'refunded') {
    const statusText = payment.status === 'expired' ? '已过期' : payment.status === 'cancelled' ? '已取消' : '已退款';
    content = (
      <StatusCard
        icon={payment.status === 'refunded' ? 'info' : 'x-circle'}
        title={`支付单${statusText}`}
        description={`支付单 ${payment.payNo} 当前状态为${statusText},如需继续购买可以返回支付页重新发起。`}
        tone={payment.status === 'refunded' ? 'info' : 'warning'}
      >
        <ButtonLink href={getBackHref(payment, query)} size="lg">返回支付页</ButtonLink>
        <ButtonLink href="/orders" variant="outline" size="lg">查看我的订单</ButtonLink>
      </StatusCard>
    );
  } else {
    content = (
      <StatusCard
        icon="rotate-cw"
        title={checking ? '正在确认支付结果' : '等待支付渠道确认'}
        description="系统正在向支付渠道确认结果,通常几秒内会更新。页面会自动刷新状态,不用重复发起支付。"
      >
        <ButtonLink href="/orders" variant="outline" size="lg">查看我的订单</ButtonLink>
        <ButtonLink href={getBackHref(payment, query)} variant="ghost" size="lg">返回支付页</ButtonLink>
      </StatusCard>
    );
  }

  return (
    <Shell withSidebar={false}>
      <main className={styles.wrap}>{content}</main>
    </Shell>
  );
}
