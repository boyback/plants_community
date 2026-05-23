import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function columnExists(tableName, columnName) {
  const rows = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
  `;
  return rows.length > 0;
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS post_pins (
      id VARCHAR(191) NOT NULL,
      postId VARCHAR(191) NOT NULL,
      scope VARCHAR(191) NOT NULL,
      targetId VARCHAR(191) NOT NULL DEFAULT '',
      orderIdx INT NOT NULL DEFAULT 0,
      pinnedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      pinnedBy VARCHAR(191) NULL,
      PRIMARY KEY (id),
      UNIQUE KEY post_pins_postId_scope_targetId_key (postId, scope, targetId),
      KEY post_pins_scope_targetId_orderIdx_pinnedAt_idx (scope, targetId, orderIdx, pinnedAt),
      CONSTRAINT post_pins_postId_fkey FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  if (await columnExists('posts', 'pinned')) {
    await prisma.$executeRawUnsafe(`
      INSERT IGNORE INTO post_pins (id, postId, scope, targetId, orderIdx, pinnedAt, pinnedBy)
      SELECT CONCAT('legacy_', id), id, 'global', '', 0, COALESCE(pinnedAt, NOW(3)), pinnedBy
      FROM posts
      WHERE pinned = 1
    `);
  }

  const drops = [];
  for (const column of ['pinned', 'pinnedAt', 'pinnedBy']) {
    if (await columnExists('posts', column)) drops.push(`DROP COLUMN ${column}`);
  }
  if (drops.length > 0) {
    await prisma.$executeRawUnsafe(`ALTER TABLE posts ${drops.join(', ')}`);
  }

  console.log('PostPin migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
