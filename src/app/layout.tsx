import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cookies, headers } from 'next/headers';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import { CookieConsentProvider } from '@/theme/CookieConsent';
import { RealtimeProvider } from '@/context/RealtimeContext';
import {
  ColorThemeProvider,
  COLOR_THEME_SSR_SCRIPT,
} from '@/context/ColorThemeContext';
import { COOKIE_LOCALE, defaultLocale, negotiateLocale, type Locale } from '@/i18n/config';
import { loadLocaleMessagesServer } from '@/i18n/server-loader';
import { getCurrentUser, isVipActive } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeUser, serializeEquip } from '@/lib/serializers';
import { expProgress } from '@/lib/levels';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

const SITE_NAME = '肉友社';
const SITE_DESC =
  '中文多肉植物爱好者社区:景天、番杏、仙人掌、大戟、十二卷,品种图鉴 + 养护技巧 + 晒图分享 + 交易市场。银冠玉、乌羽玉、兜、玉露、生石花…多肉爱好者的聚集地。';

const SITE_KEYWORDS = [
  // 大类
  '多肉', '多肉植物', '多肉爱好者社区', '多肉论坛',
  '景天', '景天科', '番杏', '仙人掌', '大戟', '十二卷', '玉露',
  // 高频品种
  '银冠玉', '乌羽玉', '兜', '生石花', '红宝石', '吉娃娃',
  '洛神', '雪莲', '初恋', '黑王子', '桃之卵', '碧光环',
  // 场景
  '多肉度夏', '多肉浇水', '多肉拼盘', '多肉繁殖', '多肉换盆', '多肉徒长',
  '多肉图鉴', '多肉品种', '多肉养护', '多肉晒图',
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · 多肉植物爱好者社区`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESC,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  applicationName: SITE_NAME,
  category: '生活',
  alternates: {
    canonical: '/',
    languages: {
      'zh-CN': '/',
      'zh-TW': '/',
      'en': '/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} · 多肉植物爱好者社区`,
    description: SITE_DESC,
    url: SITE_URL,
    locale: 'zh_CN',
    images: [
      {
        url: '/default-avatar.svg',
        width: 200,
        height: 200,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} · 多肉植物爱好者社区`,
    description: SITE_DESC,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // 站点验证 — server-side 读 env,无需 NEXT_PUBLIC_ 前缀
  // 申请百度/Google/必应/360 站长平台后填进 .env 即可,运行时生效
  verification: {
    google: process.env.SITE_VERIFICATION_GOOGLE || undefined,
    other: {
      ...(process.env.SITE_VERIFICATION_BAIDU
        ? { 'baidu-site-verification': process.env.SITE_VERIFICATION_BAIDU }
        : {}),
      ...(process.env.SITE_VERIFICATION_BING
        ? { 'msvalidate.01': process.env.SITE_VERIFICATION_BING }
        : {}),
      ...(process.env.SITE_VERIFICATION_360
        ? { '360-site-verification': process.env.SITE_VERIFICATION_360 }
        : {}),
      ...(process.env.SITE_VERIFICATION_SOGOU
        ? { 'sogou_site_verification': process.env.SITE_VERIFICATION_SOGOU }
        : {}),
    },
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌵</text></svg>',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // 允许用户缩放(无障碍)
  themeColor: '#1f2a24',
  viewportFit: 'cover', // 允许 safe-area 生效
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  // 初始 locale:cookie > 用户偏好(若登录)> Accept-Language
  const cookieStore = cookies();
  const headerStore = headers();
  let initialLocale: Locale = negotiateLocale(
    cookieStore.get(COOKIE_LOCALE)?.value ??
      headerStore.get('accept-language'),
  );

  let initialUser = null;
  let signInStreak = 0;
  let signedInToday = false;
  let initialExp = 0;
  let initialExpProgress = null as ReturnType<typeof expProgress> | null;
  let initialPointsBalance = 0;
  let initialVip = { isVip: false, lifetime: false, expireAt: null as string | null };
  let initialEquip = {};

  if (me) {
    const full = await prisma.user.findUnique({
      where: { id: me.id },
      include: {
        _count: { select: { posts: true, followers: true, following: true } },
        badges: { include: { badge: true } },
      },
    });
    if (full) {
      initialUser = serializeUser(full);
      // cookie 优先,用户偏好在未写 cookie 时生效
      if (!cookieStore.get(COOKIE_LOCALE) && full.locale) {
        initialLocale = negotiateLocale(full.locale);
      }
      signInStreak = full.signInStreak;
      const last = full.lastSignInAt;
      const now = new Date();
      signedInToday =
        !!last &&
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
      initialExp = full.exp;
      initialExpProgress = expProgress(full.exp);
      initialPointsBalance = full.pointsBalance;
      initialVip = {
        isVip: isVipActive(full),
        lifetime: full.vipLifetime,
        expireAt: full.vipExpireAt?.toISOString() ?? null,
      };

      // 装扮
      const ids = [
        full.equipBubbleId,
        full.equipReactionId,
        full.equipStickerId,
        full.equipPendantId,
      ].filter(Boolean) as string[];
      const skins = ids.length
        ? await prisma.skinItem.findMany({ where: { id: { in: ids } } })
        : [];
      const map = new Map(skins.map((s) => [s.id, s]));
      initialEquip = serializeEquip({
        bubble: full.equipBubbleId ? map.get(full.equipBubbleId) ?? null : null,
        reaction: full.equipReactionId ? map.get(full.equipReactionId) ?? null : null,
        sticker: full.equipStickerId ? map.get(full.equipStickerId) ?? null : null,
        pendant: full.equipPendantId ? map.get(full.equipPendantId) ?? null : null,
      });
    }
  }

  // SSR 时预加载当前 locale + 默认 locale 的翻译,避免 hydration 阶段裸露 key
  const [curMsgs, defMsgs] = await Promise.all([
    loadLocaleMessagesServer(initialLocale),
    initialLocale === defaultLocale
      ? Promise.resolve(null)
      : loadLocaleMessagesServer(defaultLocale),
  ]);
  const initialMessages = {
    [initialLocale]: curMsgs,
    ...(defMsgs ? { [defaultLocale]: defMsgs } : {}),
  };

  return (
    <html lang={initialLocale}>
      <head>
        {/* 必须在样式应用前同步设置 data-theme,避免主题闪烁 */}
        <script dangerouslySetInnerHTML={{ __html: COLOR_THEME_SSR_SCRIPT }} />
      </head>
      <body>
        <ColorThemeProvider>
          <I18nProvider initialLocale={initialLocale} initialMessages={initialMessages}>
            <ThemeProvider>
              <CookieConsentProvider>
                <AuthProvider
                  initialUser={initialUser}
                  initialSignInStreak={signInStreak}
                  initialSignedInToday={signedInToday}
                  initialExp={initialExp}
                  initialExpProgress={initialExpProgress}
                  initialPointsBalance={initialPointsBalance}
                  initialVip={initialVip}
                  initialEquip={initialEquip}
                >
                  <RealtimeProvider>{children}</RealtimeProvider>
                </AuthProvider>
              </CookieConsentProvider>
            </ThemeProvider>
          </I18nProvider>
        </ColorThemeProvider>
      </body>
    </html>
  );
}
