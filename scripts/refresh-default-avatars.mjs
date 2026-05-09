/**
 * 把 seed 默认 8 个用户的 avatar 刷成 /uploads/avatars/uN.svg
 *
 * 跑法:
 *   docker compose exec next node scripts/refresh-default-avatars.mjs
 * 或本地:
 *   DATABASE_URL=... node scripts/refresh-default-avatars.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const updates = [
  ['多肉阿绿', '/uploads/avatars/u1.svg'],
  ['月光玉露', '/uploads/avatars/u2.svg'],
  ['沙漠老王', '/uploads/avatars/u3.svg'],
  ['露娜酱', '/uploads/avatars/u4.svg'],
  ['花园里的熊', '/uploads/avatars/u5.svg'],
  ['清风徐来', '/uploads/avatars/u6.svg'],
  ['番杏女王', '/uploads/avatars/u7.svg'],
  ['南方小院', '/uploads/avatars/u8.svg'],
];

async function main() {
  for (const [name, url] of updates) {
    const r = await prisma.user.updateMany({
      where: { name },
      data: { avatar: url },
    });
    console.log(`${name} → ${url}  (${r.count} 行)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
