/**
 * 把 seed 默认 8 个用户(以及任何还在用 pravatar 外链的用户)的 avatar 刷成本站默认 SVG
 *
 * 跑法:
 *   docker compose exec next node scripts/refresh-default-avatars.mjs
 * 或本地:
 *   DATABASE_URL=... node scripts/refresh-default-avatars.mjs
 *
 * 备注:这个脚本不在 standalone 镜像里,需要本地或者额外挂卷:
 *   docker compose run --rm -v $(pwd)/scripts:/app/scripts:ro next node scripts/refresh-default-avatars.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT = '/default-avatar.svg';

async function main() {
  // 把所有 pravatar 外链 / seed 的旧路径头像统一刷为默认头像
  const r = await prisma.user.updateMany({
    where: {
      OR: [
        { avatar: { contains: 'pravatar.cc' } },
        { avatar: { startsWith: '/uploads/avatars/' } },
      ],
    },
    data: { avatar: DEFAULT },
  });
  console.log(`已刷新 ${r.count} 个用户的头像为 ${DEFAULT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
