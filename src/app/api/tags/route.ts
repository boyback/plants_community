import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // 从 Post 表的 tags 字段（JSON 字符串）中聚合统计标签
    const posts = await prisma.post.findMany({
      where: {
        deleted: false,
        tags: { not: null },
      },
      select: {
        tags: true,
      },
    });

    // 统计每个标签的使用次数
    const tagCountMap = new Map<string, number>();

    posts.forEach((post) => {
      if (!post.tags) return;
      try {
        const tags = JSON.parse(post.tags) as string[];
        tags.forEach((tag) => {
          const trimmed = tag.trim();
          if (trimmed) {
            tagCountMap.set(trimmed, (tagCountMap.get(trimmed) || 0) + 1);
          }
        });
      } catch {
        // 忽略无效的 JSON
      }
    });

    // 转换为数组并按使用次数排序
    const tags = Array.from(tagCountMap.entries())
      .map(([name, count], index) => ({
        id: `tag-${index}`,
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // 限制返回前100个热门标签

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
