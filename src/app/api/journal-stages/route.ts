import { z } from 'zod';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { ALL_STAGES, STAGE_META } from '@/lib/journal';

export const dynamic = 'force-dynamic';

const builtinStages = ALL_STAGES
  .filter((stage) => stage !== 'other')
  .map((stage, index) => ({
    name: STAGE_META[stage]?.zh ?? stage,
    value: stage,
    emoji: STAGE_META[stage]?.emoji ?? '',
    orderIdx: index,
    builtIn: true,
    enabled: true,
  }));

const CreateStageBody = z.object({
  name: z.string().trim().min(1).max(50),
});

const DeleteStageBody = z.object({
  id: z.string().optional(),
  value: z.string().trim().max(50).optional(),
});

async function ensureBuiltinStages() {
  await prisma.journalStageOption.createMany({
    data: builtinStages,
    skipDuplicates: true,
  });
}

function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

function fail(status: number, message: string, detail?: unknown) {
  return NextResponse.json({ ok: false, error: { message, detail } }, { status });
}

function serializeStage(stage: {
  id: string;
  name: string;
  value: string;
  emoji: string;
  orderIdx: number;
  builtIn: boolean;
  enabled: boolean;
  createdBy: string | null;
  createdAt: Date;
}, viewer?: { id: string; role?: string | null } | null) {
  const canDelete = Boolean(viewer && (viewer.role === 'admin' || stage.createdBy === viewer.id));
  return {
    id: stage.id,
    name: stage.name,
    value: stage.value,
    emoji: stage.emoji,
    orderIdx: stage.orderIdx,
    builtIn: stage.builtIn,
    enabled: stage.enabled,
    canDelete,
    createdAt: stage.createdAt.toISOString(),
  };
}

export async function GET() {
  try {
    const viewer = await getCurrentUser().catch(() => null);
    const stages = await prisma.journalStageOption.findMany({
      where: { enabled: true },
      orderBy: [{ orderIdx: 'asc' }, { createdAt: 'asc' }],
    });
    if (stages.length === 0) {
      return ok(
        builtinStages.map((stage) => ({
          id: stage.value,
          name: stage.name,
          value: stage.value,
          emoji: stage.emoji,
          orderIdx: stage.orderIdx,
          builtIn: stage.builtIn,
          enabled: stage.enabled,
          canDelete: false,
          createdAt: new Date(0).toISOString(),
        }))
      );
    }
    return ok(stages.map((stage) => serializeStage(stage, viewer)));
  } catch (error) {
    console.error('Failed to fetch journal stages:', error);
    return fail(500, '获取阶段失败');
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const body = CreateStageBody.parse(await req.json());
    const name = body.name.replace(/^#/, '').trim();
    if (!name) return fail(400, '请输入阶段名称');
    if (name === '其他' || name.toLowerCase() === 'other') {
      return fail(400, '请直接输入具体阶段名称');
    }

    await ensureBuiltinStages();

    const builtin = builtinStages.find((stage) => stage.name === name || stage.value === name);
    if (builtin) {
      const existing = await prisma.journalStageOption.findUnique({ where: { value: builtin.value } });
      if (existing) return ok(serializeStage(existing, me));
    }

    const existing = await prisma.journalStageOption.findFirst({
      where: {
        OR: [{ name }, { value: name }],
      },
    });
    if (existing) {
      if (!existing.enabled) {
        const restored = await prisma.journalStageOption.update({
          where: { id: existing.id },
          data: { enabled: true },
        });
        return ok(serializeStage(restored, me));
      }
      return ok(serializeStage(existing, me));
    }

    const maxOrder = await prisma.journalStageOption.aggregate({ _max: { orderIdx: true } });
    const created = await prisma.journalStageOption.create({
      data: {
        name,
        value: name,
        orderIdx: (maxOrder._max.orderIdx ?? builtinStages.length - 1) + 1,
        builtIn: false,
        enabled: true,
        createdBy: me.id,
      },
    });

    return ok(serializeStage(created, me));
  } catch (error) {
    if (error instanceof ZodError) return fail(400, '参数错误', error.issues);
    const status = typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : '阶段创建失败';
    return fail(status, message);
  }
}

export async function DELETE(req: Request) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const searchId = url.searchParams.get('id') ?? undefined;
    const searchValue = url.searchParams.get('value') ?? undefined;
    const body = req.headers.get('content-type')?.includes('application/json')
      ? DeleteStageBody.parse(await req.json())
      : { id: searchId, value: searchValue };
    const id = body.id?.trim();
    const value = body.value?.trim();
    if (!id && !value) return fail(400, '缺少阶段标识');

    const stage = await prisma.journalStageOption.findFirst({
      where: {
        enabled: true,
        ...(id ? { id } : { value }),
      },
    });
    if (!stage) return fail(404, '阶段不存在或已删除');

    const canDelete = me.role === 'admin' || stage.createdBy === me.id;
    if (!canDelete) return fail(403, '只能删除自己创建的阶段');

    const deleted = await prisma.journalStageOption.update({
      where: { id: stage.id },
      data: { enabled: false },
    });

    return ok({ id: deleted.id, value: deleted.value });
  } catch (error) {
    if (error instanceof ZodError) return fail(400, '参数错误', error.issues);
    const status = typeof (error as { status?: unknown }).status === 'number' ? (error as { status: number }).status : 500;
    const message = error instanceof Error ? error.message : '阶段删除失败';
    return fail(status, message);
  }
}
