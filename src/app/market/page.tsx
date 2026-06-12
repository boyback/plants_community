import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { MarketIndexClient } from './MarketIndexClient';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default function MarketPage() {
  return (
    <Shell withSidebar={false}>
      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_b39e60c3, styles.r_45a6528e)}>
        <div className={styles.r_7e0b7cdf}>
          <MarketIndexClient />
        </div>

        <aside className={styles.r_6ed543e2}>
          <SidebarLink href="/market/sell" icon="plus" tone="primary">
            我要出售
          </SidebarLink>
          <SidebarLink href="/orders" icon="package">
            我的订单
          </SidebarLink>
          <SidebarLink href="/addresses" icon="mail">
            收货地址
          </SidebarLink>

          <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_9ac94195, styles.r_eb6e8b88, styles.r_d058ca6d, styles.r_7054e276, styles.r_21d33c50)}>
            <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>安全交易</div>
            支持 支付宝 / 微信 / 官方中介担保<br />
            纠纷可申请客服仲裁
          </div>
        </aside>
      </div>
    </Shell>);

}

function SidebarLink({
  href,
  icon,
  tone = 'default',
  children





}: {href: string;icon: 'plus' | 'package' | 'mail';tone?: 'default' | 'primary';children: React.ReactNode;}) {
  return (
    <Link
      href={href}
      className={
      tone === 'primary' ? cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_45499621, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_438b2237, styles.r_ceb69a6b, styles.r_24f5f8c9) : cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_fc7473ca, styles.r_399e11a5, styles.r_ceb69a6b, styles.r_a5c39c39, styles.r_5756b7b4)


      }>

      <Icon name={icon} size={16} />
      <span>{children}</span>
      <span className={cx(styles.r_fb56d9cf, styles.r_359090c2, styles.r_0b8c506a)}>→</span>
    </Link>);

}