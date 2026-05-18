/**
 * 清理孤立的记录
 * - 找出 boardId 指向不存在板块的 genus 记录
 * - 找出 genusId 指向不存在属的 species 记录
 */
import { prisma } from '../src/lib/db';

async function main() {
  console.log('🔍 查找孤立的记录...\n');

  // 获取所有存在的 board IDs
  const existingBoards = await prisma.board.findMany({
    select: { id: true },
  });
  const existingBoardIds = new Set(existingBoards.map((b) => b.id));

  // 获取所有 genus 记录
  const allGenera = await prisma.genus.findMany({
    select: {
      id: true,
      name: true,
      boardId: true,
      _count: {
        select: {
          species: true,
          posts: true,
        },
      },
    },
  });

  // 过滤出孤立的 genus（boardId 不在存在的 board 中）
  const orphanedGenera = allGenera.filter((g) => g.boardId && !existingBoardIds.has(g.boardId));

  console.log(`找到 ${orphanedGenera.length} 个孤立的属记录：`);
  orphanedGenera.forEach((g) => {
    console.log(`  - ${g.name} (ID: ${g.id}, boardId: ${g.boardId})`);
    console.log(`    品种数: ${g._count.species}, 帖子数: ${g._count.posts}`);
  });

  // 获取所有存在的 genus IDs
  const existingGenera = await prisma.genus.findMany({
    select: { id: true },
  });
  const existingGenusIds = new Set(existingGenera.map((g) => g.id));

  // 获取所有 species 记录
  const allSpecies = await prisma.species.findMany({
    select: {
      id: true,
      name: true,
      genusId: true,
      _count: {
        select: {
          posts: true,
        },
      },
    },
  });

  // 过滤出孤立的 species（genusId 不在存在的 genus 中）
  const orphanedSpecies = allSpecies.filter((s) => !existingGenusIds.has(s.genusId));

  console.log(`\n找到 ${orphanedSpecies.length} 个孤立的品种记录：`);
  orphanedSpecies.forEach((s) => {
    console.log(`  - ${s.name} (ID: ${s.id}, genusId: ${s.genusId})`);
    console.log(`    帖子数: ${s._count.posts}`);
  });

  // 询问是否删除
  if (orphanedGenera.length === 0 && orphanedSpecies.length === 0) {
    console.log('\n✅ 没有发现孤立记录');
    return;
  }

  console.log('\n⚠️  开始删除孤立记录...\n');

  if (orphanedGenera.length > 0) {
    console.log('删除孤立的属（及其下的品种）...');
    await prisma.genus.deleteMany({
      where: {
        id: { in: orphanedGenera.map((g) => g.id) },
      },
    });
    console.log(`✅ 已删除 ${orphanedGenera.length} 个孤立的属`);
  }

  if (orphanedSpecies.length > 0) {
    console.log('删除孤立的品种...');
    await prisma.species.deleteMany({
      where: {
        id: { in: orphanedSpecies.map((s) => s.id) },
      },
    });
    console.log(`✅ 已删除 ${orphanedSpecies.length} 个孤立的品种`);
  }
}

main()
  .catch((e) => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
