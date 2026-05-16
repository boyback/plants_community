import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 获取所有功能开关配置（管理员）
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const configs = await prisma.siteConfig.findMany({
      where: {
        key: {
          startsWith: 'feature.',
        },
      },
      orderBy: {
        key: 'asc',
      },
    });

    const features = configs.map((config) => {
      let enabled = false;
      try {
        enabled = JSON.parse(config.value);
      } catch {
        enabled = false;
      }

      // 从 key 生成友好名称
      const keyParts = config.key.split('.');
      const featureName = keyParts[1] || '';
      const nameMap: Record<string, string> = {
        shaitu: '晒图广场',
        market: '交易市场',
        contests: '摄影大赛',
      };

      return {
        key: config.key,
        name: nameMap[featureName] || featureName,
        description: getFeatureDescription(config.key),
        enabled,
      };
    });

    return NextResponse.json(features);
  } catch (error) {
    console.error('获取功能配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

/**
 * 更新功能开关
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { key, enabled } = await request.json();

    if (!key || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: '参数错误' }, { status: 400 });
    }

    await prisma.siteConfig.upsert({
      where: { key },
      update: { value: JSON.stringify(enabled) },
      create: {
        key,
        value: JSON.stringify(enabled),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新功能配置失败:', error);
    return NextResponse.json({ error: '更新配置失败' }, { status: 500 });
  }
}

function getFeatureDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'feature.shaitu.enabled': '用户晒图分享功能，关闭后导航栏入口将隐藏',
    'feature.market.enabled': '二手交易市场功能，关闭后导航栏入口将隐藏',
    'feature.contests.enabled': '摄影大赛活动功能，关闭后导航栏入口将隐藏',
  };
  return descriptions[key] || '功能开关';
}
