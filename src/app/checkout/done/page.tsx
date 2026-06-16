import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import styles from './page.module.scss';

export default function CheckoutDonePage() {
  return (
    <Shell withSidebar={false}>
      <main className={styles.wrap}>
        <section className={styles.panel}>
          <div className={styles.icon}>✓</div>
          <h1 className={styles.title}>支付完成</h1>
          <p className={styles.desc}>
            如果已经在支付宝完成付款，系统会通过支付宝通知自动确认订单状态。同步结果可能会有几秒延迟，可以到我的订单查看最新状态。
          </p>
          <div className={styles.actions}>
            <Link href="/orders" className={styles.primary}>
              查看我的订单
            </Link>
            <Link href="/market" className={styles.secondary}>
              返回交易市场
            </Link>
          </div>
        </section>
      </main>
    </Shell>
  );
}
