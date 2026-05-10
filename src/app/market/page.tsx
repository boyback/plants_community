import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { MarketIndexClient } from './MarketIndexClient';

export const dynamic = 'force-dynamic';

export default function MarketPage() {
  return (
    <Shell>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_240px]">
        {/* 主内容 */}
        <div className="min-w-0">
          <MarketIndexClient />
        </div>

        {/* 右栏快捷卡 */}
        <aside className="space-y-3">
          <SidebarLink href="/market/sell" icon="plus" tone="primary">
            我要出售
          </SidebarLink>
          <SidebarLink href="/orders" icon="package">
            我的订单
          </SidebarLink>
          <SidebarLink href="/addresses" icon="mail">
            收货地址
          </SidebarLink>

          {/* 支付提示 */}
          <div className="rounded-xl border border-leaf-100 bg-leaf-50/50 p-3 text-[11px] leading-5 text-leaf-700/80">
            <div className="mb-1 font-medium text-leaf-700">🛡️ 安全交易</div>
            支持 支付宝 / 微信 / 官方中介担保<br />
            纠纷可申请客服仲裁
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function SidebarLink({
  href,
  icon,
  tone = 'default',
  children,
}: {
  href: string;
  icon: 'plus' | 'package' | 'mail';
  tone?: 'default' | 'primary';
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        tone === 'primary'
          ? 'flex items-center gap-2 rounded-xl bg-leaf-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-leaf-600'
          : 'flex items-center gap-2 rounded-xl border border-leaf-100 bg-white px-4 py-3 text-sm text-ink-800 transition-colors hover:border-leaf-300 hover:bg-leaf-50'
      }
    >
      <Icon name={icon} size={16} />
      <span>{children}</span>
      <span className="ml-auto text-xs opacity-50">→</span>
    </Link>
  );
}
