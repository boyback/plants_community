import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serializeUser } from '@/lib/serializers';

export const metadata: Metadata = {
  title: '肉友社 · 多肉植物爱好者社区',
  description: '一个面向多肉植物爱好者的交流论坛,养护技巧、图鉴、晒图、交易一站式',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌵</text></svg>',
  },
};

// 必须动态渲染,因为 RootLayout 里读 cookie
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const me = await getCurrentUser();

  let initialUser = null;
  let signInStreak = 0;
  let signedInToday = false;

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
      signInStreak = full.signInStreak;
      const last = full.lastSignInAt;
      const now = new Date();
      signedInToday =
        !!last &&
        last.getFullYear() === now.getFullYear() &&
        last.getMonth() === now.getMonth() &&
        last.getDate() === now.getDate();
    }
  }

  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider
          initialUser={initialUser}
          initialSignInStreak={signInStreak}
          initialSignedInToday={signedInToday}
        >
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
