import Image from 'next/image';
import Link from 'next/link';
import { FollowBoardButton } from '@/components/board/FollowBoardButton';
import { StickyBoardFilter } from '@/components/board/StickyBoardFilter';
import { AppShell } from '@/components/layout/AppShell';
import { PostListItem } from '@/components/post/PostListItem';
import { Empty } from '@/components/ui/Empty';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parseJsonArray } from '@/lib/api';
import { REVIEW_FILTER_ENABLED } from "@/lib/feature-flags";
import { postInclude } from "@/lib/post-include";
import { sortPostsForPins, type PinSortTarget } from "@/lib/post-pins";
import { serializePost } from '@/lib/serializers';
import { cn, formatNumber } from '@/lib/utils';
import type { Post } from '@/lib/types';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

type BoardKindFilter = 'all' | 'family' | 'discussion' | 'market' | 'system';
type PostSortFilter = 'recommended' | 'latestPost' | 'latestComment';

type BoardSearchParams = {
  kind?: string | string[];
  board?: string | string[];
  genus?: string | string[];
  species?: string | string[];
  sort?: string | string[];
};

export default async function BoardIndexPage({
  searchParams


}: {searchParams?: BoardSearchParams;}) {
  const taxonomy = await getBoardTaxonomy();
  const params = normalizeParams(searchParams);

  const selectedBoard = taxonomy.find((board) => board.slug === params.board);
  const selectedGenus = selectedBoard?.genera.find((genus) => genus.slug === params.genus);
  const selectedSpecies = selectedGenus?.species.find((species) => species.slug === params.species);
  const selectedKind = normalizeKind(params.kind, selectedBoard?.kind);
  const selectedSort = normalizeSort(params.sort);

  const boardsForRow =
  selectedKind === 'all' ?
  taxonomy :
  taxonomy.filter((board) => board.kind === selectedKind);

  const { posts, pinnedPosts, target } = await getFilteredPosts({
    kind: selectedKind,
    board: selectedBoard,
    genus: selectedGenus,
    species: selectedSpecies,
    sort: selectedSort
  });
  const recommendedBoards = getRecommendedBoards(taxonomy, selectedBoard);

  return (
    <AppShell showFloatingAi={false} className={styles.r_d14dc4ed}>
      <div className={cx(styles.r_0e12dc7d, styles.r_6da6a3c3, styles.r_726bb2cc, styles.r_3e7ce58d, styles.r_8d7541cb, styles.r_834439ca)}>
        <div className={cx(styles.r_f3c543ad, styles.r_b39e60c3, styles.r_7c927cc9)}>
          <div className={cx(styles.r_7e0b7cdf, styles.r_3e7ce58d)}>
            <BoardFilterPanel
              taxonomy={taxonomy}
              boardsForRow={boardsForRow}
              selectedKind={selectedKind}
              selectedBoard={selectedBoard}
              selectedGenus={selectedGenus}
              selectedSpecies={selectedSpecies}
              selectedSort={selectedSort} />


            <section className={cx(styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_438b2237)}>
              <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_65fdbade, styles.r_88b684d2, styles.r_d139dd09, styles.r_cb11fec3, styles.r_8a383123)}>
                <div>
                  <PostSortTabs
                    selectedSort={selectedSort}
                    kind={selectedKind}
                    board={selectedBoard?.slug}
                    genus={selectedGenus?.slug}
                    species={selectedSpecies?.slug} />

                </div>
                <p className={cx(styles.r_359090c2, styles.r_2689f395, styles.r_69335b95)}>
                  {target}
                  <span className={styles.r_418ac28d}>·</span>
                  共 {formatNumber(posts.length)} 条
                </p>
              </div>

              {posts.length > 0 ?
              posts.map((post, index) =>
              <PostListItem
                key={post.id}
                post={post}
                showDivider={index < posts.length - 1} />

              ) :

              <Empty
                icon="🌱"
                title="还没有帖子"
                desc="换个筛选看看，或者成为第一个发帖的人。" />

              }
            </section>
          </div>

          <aside className={cx(styles.r_3e7ce58d, styles.r_f271783c, styles.r_9be281fe, styles.r_bb3508ed)}>
            {selectedSpecies &&
            <BoardActivityCard
              posts={pinnedPosts}
              title={activityTitle({
                kind: selectedKind,
                board: selectedBoard,
                genus: selectedGenus,
                species: selectedSpecies
              })}
              postsCount={activityPostsCount({
                taxonomy,
                kind: selectedKind,
                board: selectedBoard,
                genus: selectedGenus,
                species: selectedSpecies
              })}
              membersCount={activityMembersCount(taxonomy, selectedBoard)}
              icon={activityIcon(selectedBoard)}
              cover={selectedSpecies.cover ?? selectedBoard?.cover}
              joinTarget={{
                board: selectedBoard,
                genus: selectedGenus,
                species: selectedSpecies
              }} />

            }
            <RecommendedBoards boards={recommendedBoards} />
          </aside>
        </div>
      </div>
    </AppShell>);

}

async function getBoardTaxonomy() {
  return prisma.board.findMany({
    where: { enabled: true },
    orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { posts: true, species: true } },
          species: {
            orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
            select: {
              id: true,
              slug: true,
              name: true,
              latinName: true,
              cover: true,
              _count: { select: { posts: true } }
            }
          }
        }
      }
    }
  });
}

type BoardTaxonomy = Awaited<ReturnType<typeof getBoardTaxonomy>>;
type BoardItem = BoardTaxonomy[number];
type GenusItem = BoardItem['genera'][number];
type SpeciesItem = GenusItem['species'][number];

async function getFilteredPosts({
  kind,
  board,
  genus,
  species,
  sort






}: {kind: BoardKindFilter;board?: BoardItem;genus?: GenusItem;species?: SpeciesItem;sort: PostSortFilter;}) {
  const where: Record<string, unknown> = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {})
  };

  let target = '全部板块';
  let currentPinTarget: PinSortTarget | null = { scope: 'global', targetId: '' };
  const pinTargets: PinSortTarget[] = [];

  if (species) {
    where.speciesId = species.id;
    target = [board?.name, genus?.name, species.name].filter(Boolean).join(' / ');
    currentPinTarget = { scope: 'species', targetId: species.id };
    pinTargets.push(currentPinTarget);
  } else if (genus) {
    where.genusId = genus.id;
    target = [board?.name, genus.name].filter(Boolean).join(' / ');
    currentPinTarget = { scope: 'genus', targetId: genus.id };
    pinTargets.push(currentPinTarget);
  } else if (board) {
    where.boardId = board.id;
    target = board.name;
    currentPinTarget = { scope: 'board', targetId: board.id };
    pinTargets.push(currentPinTarget);
  } else if (kind !== 'all') {
    where.board = { kind };
    target = kindLabel(kind);
    currentPinTarget = null;
  } else {
    pinTargets.push({ scope: 'global', targetId: '' });
  }

  const raw = await prisma.post.findMany({
    where,
    orderBy: postOrderBy(sort),
    take: 30,
    include: postInclude()
  });
  const viewer = await getCurrentUser().catch(() => null);
  const posts = sortPostsForPins(
    raw.map((post: any) => serializePost(post, undefined, undefined, viewer)),
    pinTargets
  );
  const pinnedPosts = currentPinTarget ?
  await getPinnedPosts(currentPinTarget, where, viewer) :
  [];

  return { posts, pinnedPosts, target };
}

async function getPinnedPosts(
target: PinSortTarget,
baseWhere: Record<string, unknown>,
viewer: Awaited<ReturnType<typeof getCurrentUser>> | null)
{
  const pins = await prisma.postPin.findMany({
    where: {
      scope: target.scope,
      targetId: target.targetId,
      post: baseWhere as any
    },
    orderBy: [{ orderIdx: 'asc' }, { pinnedAt: 'desc' }],
    take: 8,
    include: {
      post: {
        include: postInclude()
      }
    }
  });

  return pins.map((pin) => serializePost(pin.post as any, undefined, undefined, viewer));
}

function postOrderBy(sort: PostSortFilter) {
  if (sort === 'latestPost') {
    return [{ createdAt: 'desc' as const }];
  }
  if (sort === 'latestComment') {
    return [{ updatedAt: 'desc' as const }, { createdAt: 'desc' as const }];
  }
  return [{ hotScore: 'desc' as const }, { createdAt: 'desc' as const }];
}

function BoardFilterPanel({
  taxonomy,
  boardsForRow,
  selectedKind,
  selectedBoard,
  selectedGenus,
  selectedSpecies,
  selectedSort








}: {taxonomy: BoardTaxonomy;boardsForRow: BoardTaxonomy;selectedKind: BoardKindFilter;selectedBoard?: BoardItem;selectedGenus?: GenusItem;selectedSpecies?: SpeciesItem;selectedSort: PostSortFilter;}) {
  const allPosts = taxonomy.reduce((sum, board) => sum + (board._count?.posts ?? 0), 0);
  const currentPath = [selectedBoard?.name, selectedGenus?.name, selectedSpecies?.name].
  filter(Boolean).
  join(' / ');

  return (
    <StickyBoardFilter>
      <div className={styles.r_6ed543e2}>
        <FilterRow label="类型">
          <FilterChip href={boardHref({ sort: selectedSort })} active={selectedKind === 'all' && !selectedBoard}>
            全部
          </FilterChip>
          {(['family', 'discussion', 'market', 'system'] as const).map((kind) =>
          <FilterChip
            key={kind}
            href={boardHref({ kind, sort: selectedSort })}
            active={selectedKind === kind}>

              {kindLabel(kind)}
              <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>
                {taxonomy.filter((board) => board.kind === kind).length}
              </span>
            </FilterChip>
          )}
        </FilterRow>

        <FilterRow label="板块">
          {boardsForRow.map((board) =>
          <FilterChip
            key={board.id}
            href={boardHref({ kind: board.kind as BoardKindFilter, board: board.slug, sort: selectedSort })}
            active={selectedBoard?.id === board.id}>

              <CategoryIcon icon={firstIcon(board.icons)} name={board.name} size="sm" />
              <span>{board.name}</span>
              <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>{board._count?.posts ?? 0}</span>
            </FilterChip>
          )}
        </FilterRow>

        {selectedBoard?.kind === 'family' && selectedBoard.genera.length > 0 &&
        <FilterRow label="属">
            <FilterChip
            href={boardHref({ kind: selectedBoard.kind as BoardKindFilter, board: selectedBoard.slug, sort: selectedSort })}
            active={Boolean(selectedBoard) && !selectedGenus}>

              全部
            </FilterChip>
            {selectedBoard.genera.map((genus) =>
          <FilterChip
            key={genus.id}
            href={boardHref({
              kind: selectedBoard.kind as BoardKindFilter,
              board: selectedBoard.slug,
              genus: genus.slug,
              sort: selectedSort
            })}
            active={selectedGenus?.id === genus.id}>

                {genus.name}
                <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>{genus._count?.posts ?? 0}</span>
              </FilterChip>
          )}
          </FilterRow>
        }

        {selectedGenus && selectedGenus.species.length > 0 &&
        <FilterRow label="品种">
            <FilterChip
            href={boardHref({
              kind: selectedBoard?.kind as BoardKindFilter,
              board: selectedBoard?.slug,
              genus: selectedGenus.slug,
              sort: selectedSort
            })}
            active={!selectedSpecies}>

              全部
            </FilterChip>
            {selectedGenus.species.map((species) =>
          <FilterChip
            key={species.id}
            href={boardHref({
              kind: selectedBoard?.kind as BoardKindFilter,
              board: selectedBoard?.slug,
              genus: selectedGenus.slug,
              species: species.slug,
              sort: selectedSort
            })}
            active={selectedSpecies?.id === species.id}>

                <span className={cx(styles.r_d89972fe, styles.r_1be60d8a, styles.r_cd0d9c51, styles.r_72470489, styles.r_012fbd12, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6)}>
                  <Image src={species.cover} alt={species.name} fill className={styles.r_7d85d0c2} unoptimized />
                </span>
                <span>{species.name}</span>
                <span className={cx(styles.r_f58b0257, styles.r_1dc571a3, styles.r_f2868c22)}>{species._count?.posts ?? 0}</span>
              </FilterChip>
          )}
          </FilterRow>
        }
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div></div>
          <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_f0faeb26, styles.r_660d2eff, styles.r_359090c2, styles.r_7b89cd85)}>
            已收录 <b className={styles.r_4ddaa618}>{formatNumber(allPosts)}</b> 篇帖子
          </span>
        </div>
      </div>
    </StickyBoardFilter>);

}

function FilterRow({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_77a2a20e, styles.r_359090c2)}>
      <span className={cx(styles.r_b6b02c0e, styles.r_e7e37107, styles.r_012fbd12, styles.r_6c4cc49e)}>{label}</span>
      <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>{children}</div>
    </div>);

}

function FilterChip({
  href,
  active,
  children




}: {href: string;active: boolean;children: React.ReactNode;}) {
  return (
    <Link
      href={href}
      className={cn(cx(styles.r_52083e7d, styles.r_e4d3b004, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_0b91436d, styles.r_660d2eff, styles.r_ceb69a6b),

      active ? cx(styles.r_3bd65fe8, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_438b2237) : cx(styles.r_88b684d2, styles.r_a8a62ca4, styles.r_eb6abb1f, styles.r_5aae3db6, styles.r_2efc423a)


      )}>

      {children}
    </Link>);

}

function PostSortTabs({
  selectedSort,
  kind,
  board,
  genus,
  species






}: {selectedSort: PostSortFilter;kind: BoardKindFilter;board?: string;genus?: string;species?: string;}) {
  const items: {value: PostSortFilter;label: string;}[] = [
  { value: 'recommended', label: '推荐' },
  { value: 'latestPost', label: '最新发帖' },
  { value: 'latestComment', label: '最新评论' }];


  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e)}>
      {items.map((item) =>
      <Link
        key={item.value}
        href={boardHref({ kind, board, genus, species, sort: item.value })}
        className={cn(cx(styles.r_52083e7d, styles.r_ed8a5df7, styles.r_3960ffc2, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_e83a7042, styles.r_ceb69a6b),

        selectedSort === item.value ? cx(styles.r_3bd65fe8, styles.r_6bceb016, styles.r_72a4c7cd, styles.r_438b2237) : cx(styles.r_88b684d2, styles.r_52f53b18, styles.r_eb6abb1f, styles.r_5aae3db6, styles.r_2efc423a)


        )}>

          {item.label}
        </Link>
      )}
    </div>);

}

function BoardActivityCard({
  posts,
  title,
  postsCount,
  membersCount,
  icon,
  cover,
  joinTarget












}: {posts: Post[];title: string;postsCount: number;membersCount: number;icon: string;cover?: string | null;joinTarget: {board?: BoardItem;genus?: GenusItem;species?: SpeciesItem;};}) {
  return (
    <section className={cx(styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_24a9e3ad, styles.r_46233d42, styles.r_0d13093a, styles.r_c07e54fd, styles.r_438b2237)}>
      <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
        <div className={cx(styles.r_d89972fe, styles.r_f3c543ad, styles.r_acaee621, styles.r_baceed34, styles.r_012fbd12, styles.r_67d66567, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_39b2e003, styles.r_f53e30fc, styles.r_6307c852, styles.r_70203aca, styles.r_3febee09, styles.r_72a4c7cd, styles.r_438b2237)}>
          {cover ?
          <>
              <Image src={cover} alt={title} fill className={styles.r_7d85d0c2} unoptimized />
              <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_39b2e003, styles.r_c6724f01, styles.r_4472aea0)} />
            </> :

          <CategoryIcon icon={icon} name={title} size="lg" className={cx(styles.r_d89972fe, styles.r_236812d6, styles.r_751fb0d1)} />
          }
        </div>
        <div className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
          <h2 className={cx(styles.r_054cb4e3, styles.r_42536e69, styles.r_69450ef1, styles.r_e25ca653, styles.r_6d623258)}>{title}</h2>
          <div className={cx(styles.r_50d0d216, styles.r_60fbb771, styles.r_3960ffc2, styles.r_0c3bc985, styles.r_e82ae8be, styles.r_359090c2, styles.r_7b89cd85)}>
            <span>
              帖子: <b className={cx(styles.r_f58b0257, styles.r_e83a7042, styles.r_eb6abb1f)}>{formatNumber(postsCount)}</b>
            </span>
            <span>
              成员: <b className={cx(styles.r_f58b0257, styles.r_e83a7042, styles.r_eb6abb1f)}>{formatNumber(membersCount)}</b>
            </span>
          </div>
        </div>
      </div>

      <div className={styles.r_0ab86672}>
        <JoinAction target={joinTarget} />
      </div>

      {posts.length > 0 &&
      <div className={cx(styles.r_fb77735e, styles.r_c10ff8c0, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237, styles.r_3daca9af, styles.r_9f71048e)}>
          <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <h3 className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}>品种置顶</h3>
            <span className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>
              {posts.length} 条
            </span>
          </div>
          <div className={styles.r_14dd497e}>
            {posts.map((post) =>
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className={cx(styles.r_60fbb771, styles.r_968a1e64, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_c10ff8c0, styles.r_d5eab218, styles.r_fc7473ca, styles.r_e83a7042, styles.r_18550d59, styles.r_4ddaa618, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_81be6435)}>

                <span className={cx(styles.r_52083e7d, styles.r_f6fe9024, styles.r_012fbd12, styles.r_3960ffc2, styles.r_a3899220, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_e0e39c88, styles.r_f2b23104, styles.r_45d82811, styles.r_1dc571a3, styles.r_7fbb8569, styles.r_117ec720, styles.r_90665ca6, styles.r_c2385a46, styles.r_5f6a59f1)}>
                  TOP
                </span>
                <span className={styles.r_f50e2015}>{pinnedPostText(post)}</span>
              </Link>
          )}
          </div>
        </div>
      }
    </section>);

}

function JoinAction({
  target






}: {target: {board?: BoardItem;genus?: GenusItem;species?: SpeciesItem;};}) {
  if (target.species && target.genus && target.board) {
    return (
      <FollowBoardButton
        type="species"
        slug={target.species.slug}
        categorySlug={target.board.slug}
        genusSlug={target.genus.slug}
        size="lg"
        className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_ac204c10)} />);


  }

  if (target.genus && target.board) {
    return (
      <FollowBoardButton
        type="genus"
        slug={target.genus.slug}
        categorySlug={target.board.slug}
        size="lg"
        className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_ac204c10)} />);


  }

  if (target.board) {
    return (
      <FollowBoardButton
        type="board"
        slug={target.board.slug}
        size="lg"
        className={cx(styles.r_6da6a3c3, styles.r_86843cf1, styles.r_ac204c10)} />);


  }

  return (
    <Link
      href="/editor"
      className={cx(styles.r_52083e7d, styles.r_426b8b75, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_e0e39c88, styles.r_d139dd09, styles.r_fc7473ca, styles.r_e83a7042, styles.r_5f6a59f1, styles.r_56bf8ae8, styles.r_5756b7b4)}>

      发帖
    </Link>);

}

function RecommendedBoards({ boards }: {boards: BoardItem[];}) {
  return (
    <section className={cx(styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237)}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <h2 className={cx(styles.r_fc7473ca, styles.r_69450ef1, styles.r_4ddaa618)}>推荐板块</h2>
        <span className={cx(styles.r_359090c2, styles.r_6c4cc49e)}>最多 8 个</span>
      </div>
      <div className={styles.r_6f7e013d}>
        {boards.map((board) =>
        <Link
          key={board.id}
          href={boardHref({ kind: board.kind as BoardKindFilter, board: board.slug })}
          className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_c10ff8c0, styles.r_ca6bcd4b, styles.r_521fa0c7, styles.r_7660b450, styles.r_56bf8ae8, styles.r_67ff4d32, styles.r_5756b7b4)}>

            <span className={cx(styles.r_d89972fe, styles.r_508ebf85, styles.r_7e74e5fe, styles.r_012fbd12, styles.r_2cd02d11, styles.r_c10ff8c0, styles.r_7ebecbb6)}>
              {board.cover ?
            <Image src={board.cover} alt={board.name} fill className={styles.r_7d85d0c2} unoptimized /> :

            <span className={cx(styles.r_f3c543ad, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_67d66567, styles.r_42536e69)}>
                  <CategoryIcon icon={firstIcon(board.icons)} name={board.name} size="lg" />
                </span>
            }
            </span>
            <span className={cx(styles.r_7e0b7cdf, styles.r_36e579c0)}>
              <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>{board.name}</span>
              <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_359090c2, styles.r_6c4cc49e)}>
                {formatNumber(board.members)} 成员
              </span>
            </span>
          </Link>
        )}
      </div>
    </section>);

}

function normalizeParams(searchParams?: BoardSearchParams) {
  return {
    kind: firstParam(searchParams?.kind),
    board: firstParam(searchParams?.board),
    genus: firstParam(searchParams?.genus),
    species: firstParam(searchParams?.species),
    sort: firstParam(searchParams?.sort)
  };
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeKind(kind?: string, fallback?: string | null): BoardKindFilter {
  const value = kind ?? fallback ?? 'all';
  if (value === 'family' || value === 'discussion' || value === 'market' || value === 'system') return value;
  return 'all';
}

function normalizeSort(sort?: string): PostSortFilter {
  if (sort === 'latestPost' || sort === 'latestComment') return sort;
  return 'recommended';
}

function boardHref({
  kind,
  board,
  genus,
  species,
  sort






}: {kind?: BoardKindFilter;board?: string;genus?: string;species?: string;sort?: PostSortFilter;}) {
  const params = new URLSearchParams();
  if (kind && kind !== 'all') params.set('kind', kind);
  if (board) params.set('board', board);
  if (genus) params.set('genus', genus);
  if (species) params.set('species', species);
  if (sort && sort !== 'recommended') params.set('sort', sort);
  const query = params.toString();
  return query ? `/board?${query}` : '/board';
}

function kindLabel(kind: BoardKindFilter) {
  if (kind === 'family') return '植物分类';
  if (kind === 'discussion') return '社区讨论';
  if (kind === 'market') return '市场活动';
  if (kind === 'system') return '系统板块';
  return '全部板块';
}

function firstIcon(value: string | null) {
  return parseJsonArray(value ?? '')?.[0] ?? '🌱';
}

function getRecommendedBoards(taxonomy: BoardTaxonomy, selectedBoard?: BoardItem) {
  return [...taxonomy].
  sort((a, b) => {
    if (selectedBoard?.id === a.id) return -1;
    if (selectedBoard?.id === b.id) return 1;
    return (b._count?.posts ?? 0) - (a._count?.posts ?? 0) || b.members - a.members;
  }).
  slice(0, 8);
}

function activityTitle({
  kind,
  board,
  genus,
  species





}: {kind: BoardKindFilter;board?: BoardItem;genus?: GenusItem;species?: SpeciesItem;}) {
  return species?.name ?? genus?.name ?? board?.name ?? kindLabel(kind);
}

function activityPostsCount({
  taxonomy,
  kind,
  board,
  genus,
  species






}: {taxonomy: BoardTaxonomy;kind: BoardKindFilter;board?: BoardItem;genus?: GenusItem;species?: SpeciesItem;}) {
  if (species) return species._count?.posts ?? 0;
  if (genus) return genus._count?.posts ?? 0;
  if (board) return board._count?.posts ?? 0;
  const boards = kind === 'all' ? taxonomy : taxonomy.filter((item) => item.kind === kind);
  return boards.reduce((sum, item) => sum + (item._count?.posts ?? 0), 0);
}

function activityMembersCount(taxonomy: BoardTaxonomy, board?: BoardItem) {
  if (board) return board.members;
  return taxonomy.reduce((sum, item) => sum + item.members, 0);
}

function activityIcon(board?: BoardItem) {
  return board ? firstIcon(board.icons) : '🌱';
}

function pinnedPostText(post: Post) {
  const title = post.title?.trim();
  if (title) return title;
  const text = (post.contentText || stripHtml(post.content)).trim();
  const hasImage =
  Boolean(post.cover) ||
  Boolean(post.images?.length) ||
  /<img\b/i.test(post.content ?? '');
  if (!text) return hasImage ? "[image]" : '无标题帖子';
  if (text.includes("[image]")) return text;
  return hasImage ? `${text} [image]` : text;
}

function stripHtml(value: string) {
  return value.replace(/<img\b[^>]*>/gi, "[image]").replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}