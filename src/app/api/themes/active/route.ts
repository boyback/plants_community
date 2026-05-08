import { handler } from '@/lib/api';
import { activeThemesAt } from '@/lib/themes';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/themes/active?at=2026-12-25T10:00:00Z
 * 返回当前活跃主题。登录用户会过滤掉关闭的。
 */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const atStr = url.searchParams.get('at');
  const at = atStr ? new Date(atStr) : new Date();
  const themes = activeThemesAt(at);

  const me = await getCurrentUser();
  if (!me) {
    return { themes, at: at.toISOString(), globalDisabled: false };
  }
  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { themesDisabled: true, disabledThemes: true },
  });
  if (!u) return { themes, at: at.toISOString(), globalDisabled: false };
  if (u.themesDisabled) {
    return { themes: [], at: at.toISOString(), globalDisabled: true };
  }
  let disabled: string[] = [];
  try {
    disabled = JSON.parse(u.disabledThemes || '[]');
  } catch {
    /* ignore */
  }
  return {
    themes: themes.filter((t) => !disabled.includes(t.slug)),
    at: at.toISOString(),
    globalDisabled: false,
  };
});
