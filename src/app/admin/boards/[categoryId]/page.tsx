import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { GenusClient } from './GenusClient';
import { CategoryIconName } from '@/components/ui/CategoryIcon';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function CategoryGenusPage({
  params


}: {params: {categoryId: string;};}) {
  const board = await prisma.board.findUnique({
    where: { id: params.categoryId }
  });
  if (!board) notFound();

  const genera = await prisma.genus.findMany({
    where: { boardId: params.categoryId },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { species: true, posts: true } } }
  });

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <Link href="/admin/boards" className={cx(styles.r_359090c2, styles.r_5f6a59f1, styles.r_f673f4a7)}>
          ← 返回板块列表
        </Link>
        <h1 className={cx(styles.r_50d0d216, styles.r_3febee09, styles.r_69450ef1)}>
          <CategoryIconName icon={board.icons?.[0]} name={board.name} size="lg" /> · 属管理
        </h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          slug: <code className={cx(styles.r_07389a77, styles.r_febec8f2, styles.r_d8e0e382)}>{board.slug}</code> · 共 {genera.length} 个属
        </p>
      </div>

      <GenusClient
        boardId={board.id}
        initial={genera.map((g) => ({
          ...g,
          speciesCount: g._count.species,
          postCount: g._count.posts
        }))} />

    </div>);

}