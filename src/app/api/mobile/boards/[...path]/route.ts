import { fail, handler, parseJsonArray } from '@/lib/api';
import { prisma } from '@/lib/db';
import { postInclude } from '@/lib/post-include';
import { serializePost } from '@/lib/serializers';
import { getCurrentUser } from '@/lib/auth';
import { parseSpeciesGallery } from '@/lib/species-gallery';

export const dynamic = 'force-dynamic';

function pickPath(req: Request) {
  const parts = new URL(req.url).pathname.split('/').filter(Boolean);
  const index = parts.indexOf('boards');
  return index >= 0 ? parts.slice(index + 1).map(decodeURIComponent) : [];
}

export const GET = handler(async (req) => {
  const [categorySlug, genusSlug, speciesSlug] = pickPath(req);
  if (!categorySlug) return fail(400, '缺少图鉴路径');
  const me = await getCurrentUser().catch(() => null);

  if (speciesSlug) {
    const species = await prisma.species.findFirst({
      where: {
        slug: speciesSlug,
        genus: { slug: genusSlug, board: { slug: categorySlug } },
      },
      include: {
        genus: { include: { board: true } },
        _count: { select: { posts: true } },
      },
    });
    if (!species) return fail(404, '品种不存在');
    const galleryData = parseSpeciesGallery(species.gallery);

    const [posts, related] = await Promise.all([
      prisma.post.findMany({
        where: { speciesId: species.id, deleted: false },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: postInclude(),
      }),
      prisma.species.findMany({
        where: { genusId: species.genusId, id: { not: species.id } },
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        take: 12,
        include: { _count: { select: { posts: true } } },
      }),
    ]);

    return {
      type: 'species',
      path: [
        { label: species.genus.board?.name ?? '', slug: categorySlug },
        { label: species.genus.name, slug: genusSlug },
        { label: species.name, slug: speciesSlug },
      ],
      detail: {
        id: species.id,
        slug: species.slug,
        name: species.name,
        latinName: species.latinName,
        alias: parseJsonArray(species.alias),
        description: species.description,
        cover: species.cover,
        gallery: galleryData.items.map((item) => item.url),
        galleryItems: galleryData.items,
        coverPosition: galleryData.coverPosition,
        difficulty: species.difficulty,
        light: species.light,
        watering: species.watering,
        hardiness: species.hardiness,
        tips: parseJsonArray(species.tips),
        blooming: species.blooming,
        originRegion: species.originRegion,
        growthType: species.growthType,
        ratingCount: species.ratingCount,
        avgDifficulty:
          species.ratingCount > 0 ? species.ratingSum / species.ratingCount : species.difficulty,
        posts: species._count.posts,
        genus: {
          id: species.genus.id,
          slug: species.genus.slug,
          name: species.genus.name,
          latinName: species.genus.latinName,
        },
        category: {
          id: species.genus.board?.id ?? '',
          slug: species.genus.board?.slug ?? categorySlug,
          name: species.genus.board?.name ?? '',
        },
      },
      children: [],
      related: related.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        latinName: item.latinName,
        cover: item.cover,
        posts: item._count.posts,
        path: `/board/${categorySlug}/${genusSlug}/${item.slug}`,
      })),
      posts: posts.map((post) => serializePost(post as any, undefined, undefined, me)),
    };
  }

  if (genusSlug) {
    const genus = await prisma.genus.findFirst({
      where: { slug: genusSlug, board: { slug: categorySlug } },
      include: {
        board: true,
        _count: { select: { posts: true, species: true } },
        species: {
          orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { posts: true } } },
        },
      },
    });
    if (!genus) return fail(404, '属不存在');

    const posts = await prisma.post.findMany({
      where: { genusId: genus.id, deleted: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: postInclude(),
    });

    return {
      type: 'genus',
      path: [
        { label: genus.board?.name ?? '', slug: categorySlug },
        { label: genus.name, slug: genusSlug },
      ],
      detail: {
        id: genus.id,
        slug: genus.slug,
        name: genus.name,
        latinName: genus.latinName,
        description: genus.description,
        cover: genus.cover ?? genus.board?.cover ?? null,
        posts: genus._count.posts,
        speciesCount: genus._count.species,
        category: {
          id: genus.board?.id ?? '',
          slug: genus.board?.slug ?? categorySlug,
          name: genus.board?.name ?? '',
        },
      },
      children: genus.species.map((item) => ({
        id: item.id,
        slug: item.slug,
        name: item.name,
        latinName: item.latinName,
        cover: item.cover,
        posts: item._count.posts,
        path: `/board/${categorySlug}/${genusSlug}/${item.slug}`,
      })),
      related: [],
      posts: posts.map((post) => serializePost(post as any, undefined, undefined, me)),
    };
  }

  const category = await prisma.board.findUnique({
    where: { slug: categorySlug },
    include: {
      _count: { select: { posts: true, genera: true } },
      genera: {
        orderBy: [{ orderIdx: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { posts: true, species: true } } },
      },
    },
  });
  if (!category) return fail(404, '板块不存在');

  const posts = await prisma.post.findMany({
    where: { boardId: category.id, deleted: false },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: postInclude(),
  });

  return {
    type: 'category',
    path: [{ label: category.name, slug: categorySlug }],
    detail: {
      id: category.id,
      slug: category.slug,
      name: category.name,
      latinName: category.latinName,
      description: category.description,
      cover: category.cover,
      posts: category._count.posts,
      generaCount: category._count.genera,
    },
    children: category.genera.map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      latinName: item.latinName,
      cover: item.cover ?? category.cover,
      posts: item._count.posts,
      speciesCount: item._count.species,
      path: `/board/${categorySlug}/${item.slug}`,
    })),
    related: [],
    posts: posts.map((post) => serializePost(post as any, undefined, undefined, me)),
  };
});
