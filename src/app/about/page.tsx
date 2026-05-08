import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Logo } from '@/components/ui/Logo';
import { I18nText } from '@/components/ui/I18nText';

export default function AboutPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="card overflow-hidden">
          <div className="bg-gradient-to-br from-leaf-400 to-leaf-600 px-8 py-10 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-3xl backdrop-blur">
                🌵
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest opacity-80">
                  <I18nText k="about.tagline" fallback="About us" />
                </div>
                <h1 className="text-2xl font-bold">
                  <I18nText k="about.brandName" fallback="肉友社 · RouYou Community" />
                </h1>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-90">
              <I18nText
                k="about.intro"
                fallback="一个面向多肉植物爱好者的清新社区。我们相信:每一片叶子都值得被认真对待。"
              />
            </p>
          </div>

          <div className="space-y-6 p-8">
            <Section titleKey="about.vision.title" titleFallback="我们的愿景" emoji="🌱">
              <I18nText
                k="about.vision.body"
                fallback="让每一位养肉人都能在这里找到知音。无论你是阳台党新手,还是大棚老玩家,都能在肉友社分享日常、交流心得、结识同好。"
              />
            </Section>

            <Section titleKey="about.features.title" titleFallback="核心功能" emoji="✨">
              <ul className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Feature><I18nText k="about.features.postTypes" fallback="📝 5 种帖子类型" /></Feature>
                <Feature><I18nText k="about.features.boards" fallback="🏷️ 细分板块讨论" /></Feature>
                <Feature><I18nText k="about.features.encyclopedia" fallback="📖 多肉图鉴" /></Feature>
                <Feature><I18nText k="about.features.dm" fallback="💬 一对一私信" /></Feature>
                <Feature><I18nText k="about.features.notifications" fallback="🔔 实时通知" /></Feature>
                <Feature><I18nText k="about.features.badges" fallback="🏅 徽章成就系统" /></Feature>
                <Feature><I18nText k="about.features.voteEvent" fallback="🗳️ 投票与活动" /></Feature>
                <Feature><I18nText k="about.features.checkIn" fallback="📅 签到激励" /></Feature>
              </ul>
            </Section>

            <Section titleKey="about.rules.title" titleFallback="社区公约" emoji="🤝">
              <ol className="mt-1 ml-5 list-decimal space-y-1 text-sm">
                <li><I18nText k="about.rules.item1" fallback="尊重每一位肉友,拒绝人身攻击" /></li>
                <li><I18nText k="about.rules.item2" fallback="保持话题与多肉相关,严禁无关广告" /></li>
                <li><I18nText k="about.rules.item3" fallback="交易请通过认证渠道,谨防受骗" /></li>
                <li><I18nText k="about.rules.item4" fallback="图片请尽量原创,转载请注明来源" /></li>
                <li><I18nText k="about.rules.item5" fallback="违反以上公约的帖子将被删除" /></li>
              </ol>
            </Section>

            <Section titleKey="about.tech.title" titleFallback="技术信息" emoji="💻">
              <div className="mt-1 space-y-1 text-sm text-leaf-700/80">
                <div><I18nText k="about.tech.stack" fallback="前端框架:Next.js 14 + React 18 + TypeScript" /></div>
                <div><I18nText k="about.tech.style" fallback="样式方案:Tailwind CSS" /></div>
                <div><I18nText k="about.tech.demo" fallback="本站为演示站点,数据为 Mock,刷新后状态保留在本地" /></div>
              </div>
            </Section>

            <Section titleKey="about.contact.title" titleFallback="联系我们" emoji="📬">
              <div className="mt-1 space-y-1 text-sm">
                <div><I18nText k="about.contact.email" fallback="📧 hello@rouyou.demo" /></div>
                <div>
                  <I18nText k="about.contact.github" fallback="🐙 GitHub · " />
                  <span className="text-leaf-700">@rouyou-community</span>
                </div>
                <div><I18nText k="about.contact.wechat" fallback="💬 微信交流群:入群请私信管理员" /></div>
              </div>
            </Section>

            <div className="border-t border-leaf-100 pt-6 text-center">
              <Logo className="justify-center" />
              <div className="mt-2 text-[11px] text-leaf-700/60">
                <I18nText
                  k="about.copyright"
                  vars={{ year: new Date().getFullYear() }}
                  fallback={`© ${new Date().getFullYear()} RouYou Community — Made with 🌿 and ❤️`}
                />
              </div>
              <div className="mt-3 flex justify-center gap-4 text-xs">
                <Link href="/" className="link">
                  <I18nText k="about.links.home" fallback="返回首页" />
                </Link>
                <Link href="/board" className="link">
                  <I18nText k="about.links.boards" fallback="浏览板块" />
                </Link>
                <Link href="/plants" className="link">
                  <I18nText k="about.links.plants" fallback="多肉图鉴" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Section({
  titleKey,
  titleFallback,
  emoji,
  children,
}: {
  titleKey: string;
  titleFallback: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-800">
        <span>{emoji}</span>
        <I18nText k={titleKey} fallback={titleFallback} />
      </h2>
      <div className="mt-2 text-sm text-ink-700">{children}</div>
    </section>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-leaf-50/60 px-3 py-2 text-sm">
      {children}
    </li>
  );
}
