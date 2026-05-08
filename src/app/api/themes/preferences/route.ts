import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { THEME_REGISTRY } from '@/lib/themes';

export const dynamic = 'force-dynamic';

export const GET = handler(async () => {
  const me = await requireUser();
  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { themesDisabled: true, disabledThemes: true },
  });
  let disabled: string[] = [];
  try {
    disabled = JSON.parse(u?.disabledThemes || '[]');
  } catch {
    /* ignore */
  }
  return {
    globalDisabled: u?.themesDisabled ?? false,
    disabledSlugs: disabled,
  };
});

const Body = z.object({
  globalDisabled: z.boolean().optional(),
  disabledSlugs: z.array(z.string()).optional(),
});

export const PATCH = handler(async (req) => {
  const me = await requireUser();
  const body = Body.parse(await req.json());

  const updates: Record<string, unknown> = {};
  if (body.globalDisabled !== undefined) {
    updates.themesDisabled = body.globalDisabled;
  }
  if (body.disabledSlugs) {
    const validSlugs = new Set(THEME_REGISTRY.map((t) => t.slug));
    const cleaned = body.disabledSlugs.filter((s) => validSlugs.has(s));
    updates.disabledThemes = JSON.stringify(cleaned);
  }
  if (Object.keys(updates).length > 0) {
    await prisma.user.update({ where: { id: me.id }, data: updates });
  }
  const fresh = await prisma.user.findUnique({
    where: { id: me.id },
    select: { themesDisabled: true, disabledThemes: true },
  });
  let disabled: string[] = [];
  try {
    disabled = JSON.parse(fresh?.disabledThemes || '[]');
  } catch {
    /* ignore */
  }
  return {
    globalDisabled: fresh?.themesDisabled ?? false,
    disabledSlugs: disabled,
  };
});
