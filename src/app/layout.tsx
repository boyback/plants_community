import type { Metadata, Viewport } from 'next';
import './globals.css';
import { cookies, headers } from 'next/headers';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/i18n/I18nContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import { CookieConsentProvider } from '@/theme/CookieConsent';
import { RealtimeProvider } from '@/context/RealtimeContext';
import { COOKIE_LOCALE, defaultLocale, negotiateLocale, type Locale } from '@/i18n/config';
import { loadLocaleMessagesServer } from '@/i18n/server-loader';
import { getCurrentUser, isVipActive } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeUser, serializeEquip } from '@/lib/serializers';
import { expProgress } from '@/lib/levels';

export const metadata: Metadata = {
  title: '肉友社 · 多肉植物爱好者社区',
  description: '一个面向多肉植物爱好者的交流论坛,养护技巧、图鉴、晒图、交易一站式',
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
      <body>
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
      </body>
    </html>
  );
}
