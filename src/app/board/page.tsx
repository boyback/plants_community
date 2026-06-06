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
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';
import { postInclude } from '@/lib/post-include';
import { sortPostsForPins, type PinSortTarget } from '@/lib/post-pins';
import { serializePost } from '@/lib/serializers';
import { cn, formatNumber } from '@/lib/utils';
import type { Post } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
  searchParams,
}: {
  searchParams?: BoardSearchParams;
}) {
  const taxonomy = await getBoardTaxonomy();
  const params = normalizeParams(searchParams);

  const selectedBoard = taxonomy.find((board) => board.slug === params.board);
  const selectedGenus = selectedBoard?.genera.find((genus) => genus.slug === params.genus);
  const selectedSpecies = selectedGenus?.species.find((species) => species.slug === params.species);
  const selectedKind = normalizeKind(params.kind, selectedBoard?.kind);
  const selectedSort = normalizeSort(params.sort);

  const boardsForRow =
    selectedKind === 'all'
      ? taxonomy
      : taxonomy.filter((board) => board.kind === selectedKind);

  const { posts, pinnedPosts, target } = await getFilteredPosts({
    kind: selectedKind,
    board: selectedBoard,
    genus: selectedGenus,
    species: selectedSpecies,
    sort: selectedSort,
  });
  const recommendedBoards = getRecommendedBoards(taxonomy, selectedBoard);

  return (
    <AppShell showFloatingAi={false} className="!max-w-[1280px]">
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-20 pt-[18px]">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-4">
            <BoardFilterPanel
              taxonomy={taxonomy}
              boardsForRow={boardsForRow}
              selectedKind={selectedKind}
              selectedBoard={selectedBoard}
              selectedGenus={selectedGenus}
              selectedSpecies={selectedSpecies}
              selectedSort={selectedSort}
            />

            <section className="overflow-hidden rounded-2xl border border-leaf-100 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-leaf-100 px-5 py-4 md:px-6">
                <div>
                  <PostSortTabs
                    selectedSort={selectedSort}
                    kind={selectedKind}
                    board={selectedBoard?.slug}
                    genus={selectedGenus?.slug}
                    species={selectedSpecies?.slug}
                  />
                </div>
                <p className="text-xs font-medium text-leaf-700/70">
                  {target}
                  <span className="mx-1.5">·</span>
                  共 {formatNumber(posts.length)} 条
                </p>
              </div>

              {posts.length > 0 ? (
                posts.map((post, index) => (
                  <PostListItem
                    key={post.id}
                    post={post}
                    showDivider={index < posts.length - 1}
                  />
                ))
              ) : (
                <Empty
                  icon="🌱"
                  title="还没有帖子"
                  desc="换个筛选看看，或者成为第一个发帖的人。"
                />
              )}
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
            {selectedSpecies && (
              <BoardActivityCard
                posts={pinnedPosts}
                title={activityTitle({
                  kind: selectedKind,
                  board: selectedBoard,
                  genus: selectedGenus,
                  species: selectedSpecies,
                })}
                postsCount={activityPostsCount({
                  taxonomy,
                  kind: selectedKind,
                  board: selectedBoard,
                  genus: selectedGenus,
                  species: selectedSpecies,
                })}
                membersCount={activityMembersCount(taxonomy, selectedBoard)}
                icon={activityIcon(selectedBoard)}
                cover={selectedSpecies.cover ?? selectedBoard?.cover}
                joinTarget={{
                  board: selectedBoard,
                  genus: selectedGenus,
                  species: selectedSpecies,
                }}
              />
            )}
            <RecommendedBoards boards={recommendedBoards} />
          </aside>
        </div>
      </div>
    </AppShell>
  );
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
              _count: { select: { posts: true } },
            },
          },
        },
      },
    },
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
  sort,
}: {
  kind: BoardKindFilter;
  board?: BoardItem;
  genus?: GenusItem;
  species?: SpeciesItem;
  sort: PostSortFilter;
}) {
  const where: Record<string, unknown> = {
    deleted: false,
    ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
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
    include: postInclude(),
  });
  const viewer = await getCurrentUser().catch(() => null);
  const posts = sortPostsForPins(
    raw.map((post: any) => serializePost(post, undefined, undefined, viewer)),
    pinTargets,
  );
  const pinnedPosts = currentPinTarget
    ? await getPinnedPosts(currentPinTarget, where, viewer)
    : [];

  return { posts, pinnedPosts, target };
}

async function getPinnedPosts(
  target: PinSortTarget,
  baseWhere: Record<string, unknown>,
  viewer: Awaited<ReturnType<typeof getCurrentUser>> | null,
) {
  const pins = await prisma.postPin.findMany({
    where: {
      scope: target.scope,
      targetId: target.targetId,
      post: baseWhere as any,
    },
    orderBy: [{ orderIdx: 'asc' }, { pinnedAt: 'desc' }],
    take: 8,
    include: {
      post: {
        include: postInclude(),
      },
    },
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
  selectedSort,
}: {
  taxonomy: BoardTaxonomy;
  boardsForRow: BoardTaxonomy;
  selectedKind: BoardKindFilter;
  selectedBoard?: BoardItem;
  selectedGenus?: GenusItem;
  selectedSpecies?: SpeciesItem;
  selectedSort: PostSortFilter;
}) {
  const allPosts = taxonomy.reduce((sum, board) => sum + (board._count?.posts ?? 0), 0);
  const currentPath = [selectedBoard?.name, selectedGenus?.name, selectedSpecies?.name]
    .filter(Boolean)
    .join(' / ');

  return (
    <StickyBoardFilter>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink-900">板块筛选</h2>
          <p className="mt-1 text-xs text-leaf-700/60">
            {currentPath || kindLabel(selectedKind)}
          </p>
        </div>
        <span className="rounded-full bg-leaf-50 px-3 py-1 text-xs text-ink-500">
          已收录 <b className="text-ink-900">{formatNumber(allPosts)}</b> 篇帖子
        </span>
      </div>

      <div className="space-y-3">
        <FilterRow label="类型">
          <FilterChip href={boardHref({ sort: selectedSort })} active={selectedKind === 'all' && !selectedBoard}>
            全部
          </FilterChip>
          {(['family', 'discussion', 'market', 'system'] as const).map((kind) => (
            <FilterChip
              key={kind}
              href={boardHref({ kind, sort: selectedSort })}
              active={selectedKind === kind}
            >
              {kindLabel(kind)}
              <span className="ml-1 text-[10px] opacity-60">
                {taxonomy.filter((board) => board.kind === kind).length}
              </span>
            </FilterChip>
          ))}
        </FilterRow>

        <FilterRow label="板块">
          {boardsForRow.map((board) => (
            <FilterChip
              key={board.id}
              href={boardHref({ kind: board.kind as BoardKindFilter, board: board.slug, sort: selectedSort })}
              active={selectedBoard?.id === board.id}
            >
              <CategoryIcon icon={firstIcon(board.icons)} name={board.name} size="sm" />
              <span>{board.name}</span>
              <span className="ml-1 text-[10px] opacity-60">{board._count?.posts ?? 0}</span>
            </FilterChip>
          ))}
        </FilterRow>

        {selectedBoard?.kind === 'family' && selectedBoard.genera.length > 0 && (
          <FilterRow label="属">
            <FilterChip
              href={boardHref({ kind: selectedBoard.kind as BoardKindFilter, board: selectedBoard.slug, sort: selectedSort })}
              active={Boolean(selectedBoard) && !selectedGenus}
            >
              全部
            </FilterChip>
            {selectedBoard.genera.map((genus) => (
              <FilterChip
                key={genus.id}
                href={boardHref({
                  kind: selectedBoard.kind as BoardKindFilter,
                  board: selectedBoard.slug,
                  genus: genus.slug,
                  sort: selectedSort,
                })}
                active={selectedGenus?.id === genus.id}
              >
                {genus.name}
                <span className="ml-1 text-[10px] opacity-60">{genus._count?.posts ?? 0}</span>
              </FilterChip>
            ))}
          </FilterRow>
        )}

        {selectedGenus && selectedGenus.species.length > 0 && (
          <FilterRow label="品种">
            <FilterChip
              href={boardHref({
                kind: selectedBoard?.kind as BoardKindFilter,
                board: selectedBoard?.slug,
                genus: selectedGenus.slug,
                sort: selectedSort,
              })}
              active={!selectedSpecies}
            >
              全部
            </FilterChip>
            {selectedGenus.species.map((species) => (
              <FilterChip
                key={species.id}
                href={boardHref({
                  kind: selectedBoard?.kind as BoardKindFilter,
                  board: selectedBoard?.slug,
                  genus: selectedGenus.slug,
                  species: species.slug,
                  sort: selectedSort,
                })}
                active={selectedSpecies?.id === species.id}
              >
                <span className="relative -ml-1 h-5 w-5 shrink-0 overflow-hidden rounded-[6px] bg-leaf-50">
                  <Image src={species.cover} alt={species.name} fill className="object-cover" unoptimized />
                </span>
                <span>{species.name}</span>
                <span className="ml-1 text-[10px] opacity-60">{species._count?.posts ?? 0}</span>
              </FilterChip>
            ))}
          </FilterRow>
        )}
      </div>
    </StickyBoardFilter>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="mt-1 w-12 shrink-0 text-leaf-700/60">{label}</span>
      <div className="flex flex-1 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-7 items-center gap-1 rounded-[6px] border px-2.5 py-1 transition-colors',
        active
          ? 'border-leaf-600 bg-leaf-600 text-white shadow-sm'
          : 'border-leaf-100 bg-leaf-50/60 text-ink-700 hover:border-leaf-200 hover:bg-leaf-100',
      )}
    >
      {children}
    </Link>
  );
}

function PostSortTabs({
  selectedSort,
  kind,
  board,
  genus,
  species,
}: {
  selectedSort: PostSortFilter;
  kind: BoardKindFilter;
  board?: string;
  genus?: string;
  species?: string;
}) {
  const items: { value: PostSortFilter; label: string }[] = [
    { value: 'recommended', label: '推荐' },
    { value: 'latestPost', label: '最新发帖' },
    { value: 'latestComment', label: '最新评论' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <Link
          key={item.value}
          href={boardHref({ kind, board, genus, species, sort: item.value })}
          className={cn(
            'inline-flex h-8 items-center rounded-[6px] border px-3 text-sm font-semibold transition-colors',
            selectedSort === item.value
              ? 'border-leaf-600 bg-leaf-600 text-white shadow-sm'
              : 'border-leaf-100 bg-leaf-50/70 text-ink-700 hover:border-leaf-200 hover:bg-leaf-100',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

function BoardActivityCard({
  posts,
  title,
  postsCount,
  membersCount,
  icon,
  cover,
  joinTarget,
}: {
  posts: Post[];
  title: string;
  postsCount: number;
  membersCount: number;
  icon: string;
  cover?: string | null;
  joinTarget: {
    board?: BoardItem;
    genus?: GenusItem;
    species?: SpeciesItem;
  };
}) {
  return (
    <section className="rounded-[6px] border border-leaf-100 bg-gradient-to-b from-leaf-50/70 to-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-gradient-to-br from-leaf-300 via-leaf-500 to-leaf-700 text-2xl text-white shadow-sm">
          {cover ? (
            <>
              <Image src={cover} alt={title} fill className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-br from-leaf-700/15 to-ink-900/20" />
            </>
          ) : (
            <CategoryIcon icon={icon} name={title} size="lg" className="relative z-10 text-3xl" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-lg font-bold leading-snug text-ink-950">{title}</h2>
          <div className="mt-2 flex items-center gap-4 whitespace-nowrap text-xs text-ink-500">
            <span>
              帖子: <b className="ml-1 font-semibold text-ink-700">{formatNumber(postsCount)}</b>
            </span>
            <span>
              成员: <b className="ml-1 font-semibold text-ink-700">{formatNumber(membersCount)}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <JoinAction target={joinTarget} />
      </div>

      {posts.length > 0 && (
        <div className="mt-5 rounded-[6px] bg-white p-4 shadow-sm ring-1 ring-leaf-100/80">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-ink-900">品种置顶</h3>
            <span className="rounded-full bg-leaf-50 px-2.5 py-1 text-xs font-medium text-leaf-700">
              {posts.length} 条
            </span>
          </div>
          <div className="space-y-2.5">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="flex min-h-9 items-center gap-3 rounded-[6px] px-2 text-sm font-semibold leading-6 text-ink-900 transition hover:bg-leaf-50 hover:text-leaf-800"
              >
                <span className="inline-flex h-6 shrink-0 items-center gap-0.5 rounded-[6px] border border-leaf-300 bg-leaf-100 px-1.5 text-[10px] font-black uppercase italic leading-none text-leaf-700">
                  TOP
                </span>
                <span className="line-clamp-1">{pinnedPostText(post)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function JoinAction({
  target,
}: {
  target: {
    board?: BoardItem;
    genus?: GenusItem;
    species?: SpeciesItem;
  };
}) {
  if (target.species && target.genus && target.board) {
    return (
      <FollowBoardButton
        type="species"
        slug={target.species.slug}
        categorySlug={target.board.slug}
        genusSlug={target.genus.slug}
        size="lg"
        className="w-full justify-center rounded-full"
      />
    );
  }

  if (target.genus && target.board) {
    return (
      <FollowBoardButton
        type="genus"
        slug={target.genus.slug}
        categorySlug={target.board.slug}
        size="lg"
        className="w-full justify-center rounded-full"
      />
    );
  }

  if (target.board) {
    return (
      <FollowBoardButton
        type="board"
        slug={target.board.slug}
        size="lg"
        className="w-full justify-center rounded-full"
      />
    );
  }

  return (
    <Link
      href="/editor"
      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-leaf-300 px-5 text-sm font-semibold text-leaf-700 transition hover:bg-leaf-50"
    >
      发帖
    </Link>
  );
}

function RecommendedBoards({ boards }: { boards: BoardItem[] }) {
  return (
    <section className="rounded-2xl border border-leaf-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">推荐板块</h2>
        <span className="text-xs text-leaf-700/60">最多 8 个</span>
      </div>
      <div className="space-y-2">
        {boards.map((board) => (
          <Link
            key={board.id}
            href={boardHref({ kind: board.kind as BoardKindFilter, board: board.slug })}
            className="flex items-center gap-3 rounded-[6px] border border-transparent p-2 transition hover:border-leaf-100 hover:bg-leaf-50"
          >
            <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded-[6px] bg-leaf-50">
              {board.cover ? (
                <Image src={board.cover} alt={board.name} fill className="object-cover" unoptimized />
              ) : (
                <span className="grid h-full w-full place-items-center text-lg">
                  <CategoryIcon icon={firstIcon(board.icons)} name={board.name} size="lg" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink-900">{board.name}</span>
              <span className="mt-0.5 block text-xs text-leaf-700/60">
                {formatNumber(board.members)} 成员
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function normalizeParams(searchParams?: BoardSearchParams) {
  return {
    kind: firstParam(searchParams?.kind),
    board: firstParam(searchParams?.board),
    genus: firstParam(searchParams?.genus),
    species: firstParam(searchParams?.species),
    sort: firstParam(searchParams?.sort),
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
  sort,
}: {
  kind?: BoardKindFilter;
  board?: string;
  genus?: string;
  species?: string;
  sort?: PostSortFilter;
}) {
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
  return [...taxonomy]
    .sort((a, b) => {
      if (selectedBoard?.id === a.id) return -1;
      if (selectedBoard?.id === b.id) return 1;
      return (b._count?.posts ?? 0) - (a._count?.posts ?? 0) || b.members - a.members;
    })
    .slice(0, 8);
}

function activityTitle({
  kind,
  board,
  genus,
  species,
}: {
  kind: BoardKindFilter;
  board?: BoardItem;
  genus?: GenusItem;
  species?: SpeciesItem;
}) {
  return species?.name ?? genus?.name ?? board?.name ?? kindLabel(kind);
}

function activityPostsCount({
  taxonomy,
  kind,
  board,
  genus,
  species,
}: {
  taxonomy: BoardTaxonomy;
  kind: BoardKindFilter;
  board?: BoardItem;
  genus?: GenusItem;
  species?: SpeciesItem;
}) {
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
  if (!text) return hasImage ? '[image]' : '无标题帖子';
  if (text.includes('[image]')) return text;
  return hasImage ? `${text} [image]` : text;
}

function stripHtml(value: string) {
  return value.replace(/<img\b[^>]*>/gi, ' [image] ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
