#!/usr/bin/env tsx
/**
 * 合并重复的科(Category)数据
 *
 * 策略:
 * 1. 找出所有重复的科名
 * 2. 对每组重复的科,保留带有icon的那个(如果都有或都没有,保留第一个)
 * 3. 层层递进合并:
 *    - 先合并品种(Species)下的帖子(Post)
 *    - 再合并属(Genus)下的品种(Species)
 *    - 再合并科(Category)下的属(Genus)
 *    - 最后删除重复的科
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DuplicateGroup {
  name: string
  categories: Array<{
    id: string
    slug: string
    name: string
    icon: string
    orderIdx: number
  }>
}

async function findDuplicateCategories(): Promise<DuplicateGroup[]> {
  console.log('🔍 查找重复的科名...')

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

  // 按名称分组
  const grouped = new Map<string, typeof categories>()
  for (const cat of categories) {
    const existing = grouped.get(cat.name) || []
    existing.push(cat)
    grouped.set(cat.name, existing)
  }

  // 只保留重复的
  const duplicates: DuplicateGroup[] = []
  for (const [name, cats] of grouped.entries()) {
    if (cats.length > 1) {
      duplicates.push({ name, categories: cats })
    }
  }

  return duplicates
}

function selectTargetCategory(categories: DuplicateGroup['categories']) {
  // 优先选择有icon的
  const withIcon = categories.filter(c => c.icon && c.icon.trim() !== '')
  if (withIcon.length > 0) {
    return withIcon[0]
  }
  // 否则返回第一个
  return categories[0]
}

async function mergeSpeciesPosts(sourceSpeciesId: string, targetSpeciesId: string) {
  const posts = await prisma.post.findMany({
    where: { speciesId: sourceSpeciesId },
    select: { id: true, title: true }
  })

  if (posts.length > 0) {
    console.log(`    📝 合并 ${posts.length} 个帖子从品种 ${sourceSpeciesId} 到 ${targetSpeciesId}`)
    await prisma.post.updateMany({
      where: { speciesId: sourceSpeciesId },
      data: { speciesId: targetSpeciesId }
    })
  }
}

async function mergeGenusSpecies(sourceGenusId: string, targetGenusId: string) {
  const species = await prisma.species.findMany({
    where: { genusId: sourceGenusId },
    select: { id: true, name: true, slug: true }
  })

  if (species.length === 0) {
    return
  }

  console.log(`  🌿 处理 ${species.length} 个品种从属 ${sourceGenusId} 到 ${targetGenusId}`)

  for (const sp of species) {
    // 检查目标属中是否已存在同名品种
    const existingSpecies = await prisma.species.findFirst({
      where: {
        genusId: targetGenusId,
        name: sp.name
      }
    })

    if (existingSpecies) {
      console.log(`    ⚠️  品种 "${sp.name}" 已存在于目标属,合并帖子...`)
      // 合并帖子
      await mergeSpeciesPosts(sp.id, existingSpecies.id)

      // 合并评分
      const ratings = await prisma.speciesRating.findMany({
        where: { speciesId: sp.id }
      })
      for (const rating of ratings) {
        const existingRating = await prisma.speciesRating.findUnique({
          where: {
            userId_speciesId: {
              userId: rating.userId,
              speciesId: existingSpecies.id
            }
          }
        })
        if (!existingRating) {
          await prisma.speciesRating.update({
            where: { id: rating.id },
            data: { speciesId: existingSpecies.id }
          })
        } else {
          // 如果已存在,删除旧的
          await prisma.speciesRating.delete({
            where: { id: rating.id }
          })
        }
      }

      // 合并日志
      await prisma.journal.updateMany({
        where: { speciesId: sp.id },
        data: { speciesId: existingSpecies.id }
      })

      // 合并大赛作品
      await prisma.contestEntry.updateMany({
        where: { speciesId: sp.id },
        data: { speciesId: existingSpecies.id }
      })

      // 删除源品种
      await prisma.species.delete({ where: { id: sp.id } })
      console.log(`    ✅ 已删除重复品种 "${sp.name}"`)
    } else {
      // 直接移动到目标属
      console.log(`    ➡️  移动品种 "${sp.name}" 到目标属`)
      await prisma.species.update({
        where: { id: sp.id },
        data: { genusId: targetGenusId }
      })
    }
  }
}

async function mergeCategoryGenera(sourceCategoryId: string, targetCategoryId: string) {
  const genera = await prisma.genus.findMany({
    where: { categoryId: sourceCategoryId },
    select: { id: true, name: true, slug: true }
  })

  if (genera.length === 0) {
    return
  }

  console.log(`🌳 处理 ${genera.length} 个属从科 ${sourceCategoryId} 到 ${targetCategoryId}`)

  for (const genus of genera) {
    // 检查目标科中是否已存在同名属
    const existingGenus = await prisma.genus.findFirst({
      where: {
        categoryId: targetCategoryId,
        name: genus.name
      }
    })

    if (existingGenus) {
      console.log(`  ⚠️  属 "${genus.name}" 已存在于目标科,合并品种...`)
      // 合并品种
      await mergeGenusSpecies(genus.id, existingGenus.id)

      // 合并帖子
      const posts = await prisma.post.findMany({
        where: { genusId: genus.id },
        select: { id: true }
      })
      if (posts.length > 0) {
        console.log(`  📝 合并 ${posts.length} 个帖子从属 ${genus.id} 到 ${existingGenus.id}`)
        await prisma.post.updateMany({
          where: { genusId: genus.id },
          data: { genusId: existingGenus.id }
        })
      }

      // 合并商品
      await prisma.product.updateMany({
        where: { genusId: genus.id },
        data: { genusId: existingGenus.id }
      })

      // 合并拍卖
      await prisma.auction.updateMany({
        where: { genusId: genus.id },
        data: { genusId: existingGenus.id }
      })

      // 删除源属
      await prisma.genus.delete({ where: { id: genus.id } })
      console.log(`  ✅ 已删除重复属 "${genus.name}"`)
    } else {
      // 直接移动到目标科
      console.log(`  ➡️  移动属 "${genus.name}" 到目标科`)
      await prisma.genus.update({
        where: { id: genus.id },
        data: { categoryId: targetCategoryId }
      })
    }
  }
}

async function mergeDuplicateCategory(group: DuplicateGroup) {
  const target = selectTargetCategory(group.categories)
  const sources = group.categories.filter(c => c.id !== target.id)

  console.log(`\n📦 合并科: "${group.name}"`)
  console.log(`  ✅ 保留: ${target.slug} (ID: ${target.id}, Icon: ${target.icon || '无'})`)
  console.log(`  ❌ 删除: ${sources.map(s => `${s.slug} (${s.id})`).join(', ')}`)

  for (const source of sources) {
    // 1. 合并属(及其下的品种和帖子)
    await mergeCategoryGenera(source.id, target.id)

    // 2. 合并直接挂在科下的帖子
    const posts = await prisma.post.findMany({
      where: { categoryId: source.id },
      select: { id: true }
    })
    if (posts.length > 0) {
      console.log(`📝 合并 ${posts.length} 个帖子从科 ${source.id} 到 ${target.id}`)
      await prisma.post.updateMany({
        where: { categoryId: source.id },
        data: { categoryId: target.id }
      })
    }

    // 3. 删除源科
    await prisma.category.delete({ where: { id: source.id } })
    console.log(`✅ 已删除重复科 "${source.slug}"`)
  }
}

async function main() {
  console.log('🚀 开始合并重复的科数据...\n')

  try {
    const duplicates = await findDuplicateCategories()

    if (duplicates.length === 0) {
      console.log('✅ 没有发现重复的科名')
      return
    }

    console.log(`\n找到 ${duplicates.length} 组重复的科:\n`)
    for (const group of duplicates) {
      console.log(`- "${group.name}": ${group.categories.length} 个重复`)
      for (const cat of group.categories) {
        console.log(`  - ${cat.slug} (ID: ${cat.id}, Icon: ${cat.icon || '无'})`)
      }
    }

    console.log('\n⚠️  即将开始合并,请确认以上信息...')
    console.log('按 Ctrl+C 取消,或等待 5 秒后自动开始...\n')

    await new Promise(resolve => setTimeout(resolve, 5000))

    // 逐个处理重复组
    for (const group of duplicates) {
      await mergeDuplicateCategory(group)
    }

    console.log('\n✅ 所有重复科已成功合并!')

    // 显示最终结果
    const finalCategories = await prisma.category.findMany({
      select: { name: true, slug: true, icon: true },
      orderBy: { orderIdx: 'asc' }
    })
    console.log(`\n📊 当前科总数: ${finalCategories.length}`)

  } catch (error) {
    console.error('❌ 合并过程中出错:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
