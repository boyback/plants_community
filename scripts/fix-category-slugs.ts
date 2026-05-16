#!/usr/bin/env tsx
/**
 * 修复科的 slug - 将中文 slug 改回英文
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const slugMapping: Record<string, string> = {
  '景天科': 'jingtian',
  '马齿苋科': 'machixian',
  '萝藦科': 'luomoke',
  '大戟科': 'dajike',
  '番杏科': 'fanxing',
  '仙人掌科': 'xianrenzhang',
}

async function main() {
  console.log('🔧 开始修复科的 slug...\n')

  for (const [chineseName, englishSlug] of Object.entries(slugMapping)) {
    const category = await prisma.board.findFirst({
      where: { name: chineseName }
    })

    if (category) {
      console.log(`修复: ${chineseName} (${category.slug}) -> ${englishSlug}`)
      await prisma.board.update({
        where: { id: category.id },
        data: { slug: englishSlug }
      })
      console.log(`✅ 已更新\n`)
    } else {
      console.log(`⚠️  未找到: ${chineseName}\n`)
    }
  }

  console.log('✅ 所有 slug 已修复!')

  // 显示最终结果
  const categories = await prisma.board.findMany({
    select: { name: true, slug: true },
    orderBy: { orderIdx: 'asc' }
  })

  console.log('\n当前所有科的 slug:')
  console.log('='.repeat(60))
  for (const cat of categories) {
    console.log(`${cat.name.padEnd(15)} | slug: ${cat.slug}`)
  }
}

main()
  .finally(() => prisma.$disconnect())
