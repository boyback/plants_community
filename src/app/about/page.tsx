import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { Logo } from '@/components/ui/Logo';
import { I18nText } from '@/components/ui/I18nText';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function AboutPage() {
  return (
    <Shell>
      <div className={cx(styles.r_0e12dc7d, styles.r_fa3f7111)}>
        <div className={styles.r_2cd02d11}>
          <div className={cx(styles.r_39b2e003, styles.r_78ce000e, styles.r_0a6f1c29, styles.r_7e3e9a76, styles.r_1100bef6, styles.r_72a4c7cd)}>
            <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3)}>
              <div className={cx(styles.r_f3c543ad, styles.r_73a13409, styles.r_7e74e5fe, styles.r_67d66567, styles.r_68f2db62, styles.r_2cf6fd42, styles.r_751fb0d1, styles.r_0b2e8c28)}>
                🌵
              </div>
              <div>
                <div className={cx(styles.r_d058ca6d, styles.r_117ec720, styles.r_08cc9b1d, styles.r_714816ef)}>
                  <I18nText k="about.tagline" fallback="About us" />
                </div>
                <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>
                  <I18nText k="about.brandName" fallback="植友圈 · ZhiYou Community" />
                </h1>
              </div>
            </div>
            <p className={cx(styles.r_fb77735e, styles.r_9ef2b581, styles.r_fc7473ca, styles.r_6b189c6e, styles.r_4f5874c5)}>
              <I18nText
                k="about.intro"
                fallback="一个面向多肉植物爱好者的清新社区。我们相信:每一片叶子都值得被认真对待。" />

            </p>
          </div>

          <div className={cx(styles.r_b3542e05, styles.r_845f5336)}>
            <Section titleKey="about.vision.title" titleFallback="我们的愿景" emoji="🌱">
              <I18nText
                k="about.vision.body"
                fallback="让每一位养肉人都能在这里找到知音。无论你是阳台党新手,还是大棚老玩家,都能在植友圈分享日常、交流心得、结识同好。" />

            </Section>

            <Section titleKey="about.features.title" titleFallback="核心功能" emoji="✨">
              <ul className={cx(styles.r_b6b02c0e, styles.r_f3c543ad, styles.r_d7c83398, styles.r_77a2a20e, styles.r_e00ad816)}>
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
              <ol className={cx(styles.r_b6b02c0e, styles.r_ee19a23d, styles.r_a0df6401, styles.r_da7c36cd, styles.r_fc7473ca)}>
                <li><I18nText k="about.rules.item1" fallback="尊重每一位肉友,拒绝人身攻击" /></li>
                <li><I18nText k="about.rules.item2" fallback="保持话题与多肉相关,严禁无关广告" /></li>
                <li><I18nText k="about.rules.item3" fallback="交易请通过认证渠道,谨防受骗" /></li>
                <li><I18nText k="about.rules.item4" fallback="图片请尽量原创,转载请注明来源" /></li>
                <li><I18nText k="about.rules.item5" fallback="违反以上公约的帖子将被删除" /></li>
              </ol>
            </Section>

            <Section titleKey="about.tech.title" titleFallback="技术信息" emoji="💻">
              <div className={cx(styles.r_b6b02c0e, styles.r_da7c36cd, styles.r_fc7473ca, styles.r_21d33c50)}>
                <div><I18nText k="about.tech.stack" fallback="前端框架:Next.js 14 + React 18 + TypeScript" /></div>
                <div><I18nText k="about.tech.style" fallback="样式方案:SCSS + px-vw" /></div>
                <div><I18nText k="about.tech.demo" fallback="本站为演示站点,数据为 Mock,刷新后状态保留在本地" /></div>
              </div>
            </Section>

            <Section titleKey="about.contact.title" titleFallback="联系我们" emoji="📬">
              <div className={cx(styles.r_b6b02c0e, styles.r_da7c36cd, styles.r_fc7473ca)}>
                <div><I18nText k="about.contact.email" fallback="📧 hello@rouyou.demo" /></div>
                <div>
                  <I18nText k="about.contact.github" fallback="🐙 GitHub · " />
                  <span className={styles.r_5f6a59f1}>@rouyou-community</span>
                </div>
                <div><I18nText k="about.contact.wechat" fallback="💬 微信交流群:入群请私信管理员" /></div>
              </div>
            </Section>

            <div className={cx(styles.r_b950dda2, styles.r_88b684d2, styles.r_30c1d058, styles.r_ca6bf630)}>
              <Logo className={styles.r_86843cf1} />
              <div className={cx(styles.r_50d0d216, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                <I18nText
                  k="about.copyright"
                  vars={{ year: new Date().getFullYear() }}
                  fallback={`© ${new Date().getFullYear()} ZhiYou Community — Made with 🌿 and ❤️`} />

              </div>
              <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_86843cf1, styles.r_0c3bc985, styles.r_359090c2)}>
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
    </Shell>);

}

function Section({
  titleKey,
  titleFallback,
  emoji,
  children





}: {titleKey: string;titleFallback: string;emoji: string;children: React.ReactNode;}) {
  return (
    <section>
      <h2 className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>
        <span>{emoji}</span>
        <I18nText k={titleKey} fallback={titleFallback} />
      </h2>
      <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_eb6abb1f)}>{children}</div>
    </section>);

}

function Feature({ children }: {children: React.ReactNode;}) {
  return (
    <li className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_a8a62ca4, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca)}>
      {children}
    </li>);

}