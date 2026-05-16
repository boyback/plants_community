#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      orderIdx: true,
    },
    orderBy: { orderIdx: 'asc' }
  })

  console.log('当前所有科的 slug:')
  console.log('='.repeat(80))
  for (const cat of categories) {
    console.log(`${cat.name.padEnd(15)} | slug: ${cat.slug.padEnd(20)} | icon: ${cat.icon}`)
  }
  console.log('='.repeat(80))
  console.log(`总计: ${categories.length} 个科`)
}

main()
  .finally(() => prisma.$disconnect())
