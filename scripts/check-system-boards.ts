/**
 * 检查系统板块的图标数据
 */
import { prisma } from '../src/lib/db';

async function main() {
  const systemBoards = await prisma.board.findMany({
    where: {
      kind: 'system',
    },
    select: {
      id: true,
      slug: true,
      name: true,
      icons: true,
      kind: true,
    },
  });

  console.log('系统板块列表：\n');
  systemBoards.forEach((board) => {
    console.log(`${board.name} (${board.slug})`);
    console.log(`  ID: ${board.id}`);
    console.log(`  icons (原始): ${board.icons}`);
    try {
      const parsed = JSON.parse(board.icons || '[]');
      console.log(`  icons (解析): ${JSON.stringify(parsed)}`);
      console.log(`  第一个图标: ${parsed[0] || '(空)'}`);
    } catch (e) {
      console.log(`  解析失败: ${e}`);
    }
    console.log('');
  });
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
