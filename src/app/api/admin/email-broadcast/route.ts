/**
 * GET  /api/admin/email-broadcast        列表(最新 50 条)
 * POST /api/admin/email-broadcast        创建任务
 *   body: {
 *     subject, html, text?, throttleMs?,
 *     // 模板预设(优先级低于 subject/html)
 *     preset?: 'spring' | 'midautumn' | 'custom',
 *     // 收件人筛选
 *     filter: {
 *       allEmailUsers?: boolean,        // 所有有邮箱的用户(默认 true)
 *       includeUnsubscribed?: boolean,  // 默认 false:跳过取消订阅用户
 *       userIds?: string[],             // 直接指定 userIds
 *     }
 *   }
 *   会立即创建 broadcast (status=draft) + 落收件人快照
 */
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { handler, fail } from '@/lib/api';
import { requireAdmin } from '@/lib/auth';
import { springFestivalEmail, midAutumnEmail } from '@/lib/email-templates';
import { makeUnsubscribeUrl } from '@/lib/email-unsubscribe';

const FilterSchema = z.object({
  allEmailUsers: z.boolean().optional(),
  includeUnsubscribed: z.boolean().optional(),
  userIds: z.array(z.string()).optional(),
});

const CreateBody = z
  .object({
    subject: z.string().min(2).max(200).optional(),
    html: z.string().min(10).optional(),
    text: z.string().optional(),
    throttleMs: z.number().min(1000).max(60000).optional(),
    preset: z.enum(['spring', 'midautumn', 'custom']).optional(),
    filter: FilterSchema,
  })
  .refine((d) => !!d.preset || (!!d.subject && !!d.html), {
    message: 'preset 或 (subject + html) 必填一个',
  });

export const GET = handler(async () => {
  await requireAdmin();
  const items = await prisma.emailBroadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return items;
});

export const POST = handler(async (req) => {
  const me = await requireAdmin();
  const body = CreateBody.parse(await req.json());

  // —— 1. 拼模板 —— (preset 优先;custom 用 body.subject/html)
  // 取消订阅 URL 用「占位 user id」生成,后面落 recipient 时,worker 会动态替换
  // 简化方案:用一个固定 placeholder,实际发送前由 worker 替换为真实 token
  // 这里先用 placeholder,worker tick 时替换
  const PLACEHOLDER_UNSUB = 'https://__UNSUBSCRIBE_URL__/'; // 后续 worker 替换
  let subject: string;
  let html: string;
  let text: string | undefined;
  if (body.preset === 'spring') {
    const t = springFestivalEmail({ unsubscribeUrl: PLACEHOLDER_UNSUB });
    subject = t.subject;
    html = t.html;
    text = t.text;
  } else if (body.preset === 'midautumn') {
    const t = midAutumnEmail({ unsubscribeUrl: PLACEHOLDER_UNSUB });
    subject = t.subject;
    html = t.html;
    text = t.text;
  } else {
    subject = body.subject!;
    html = body.html!;
    text = body.text;
  }

  // —— 2. 解析收件人 —— 
  const where: Record<string, unknown> = {
    email: { not: null },
  };
  if (body.filter.userIds && body.filter.userIds.length > 0) {
    where.id = { in: body.filter.userIds };
  }
  if (!body.filter.includeUnsubscribed) {
    where.emailUnsubscribed = false;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true },
  });
  if (users.length === 0) return fail(400, '没有匹配的收件人');

  // —— 3. 创建 broadcast 任务 + 收件人快照 —— 
  const created = await prisma.emailBroadcast.create({
    data: {
      subject,
      html,
      text,
      createdBy: me.id,
      filterJson: JSON.stringify(body.filter),
      total: users.length,
      throttleMs: body.throttleMs ?? 4000,
      status: 'draft',
      recipients: {
        create: users.map((u) => ({
          userId: u.id,
          email: u.email!,
        })),
      },
    },
  });

  return { id: created.id, total: users.length };
});
