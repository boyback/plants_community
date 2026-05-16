import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * 获取所有功能开关配置
 */
export async function GET() {
  try {
    const configs = await prisma.siteConfig.findMany({
      where: {
        key: {
          startsWith: 'feature.',
        },
      },
    });

    const features: Record<string, boolean> = {};
    for (const config of configs) {
      try {
        features[config.key] = JSON.parse(config.value);
      } catch {
        features[config.key] = false;
      }
    }

    return NextResponse.json(features);
  } catch (error) {
    console.error('获取功能开关失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}
