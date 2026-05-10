/**
 * GET /api/search?q=xxx&kind=all|posts|species|boards|users
 *
 * 4 维并行模糊搜索:
 *   - posts:   title / content (LIKE)
 *   - species: name / latinName
 *   - boards:  name / description
 *   - users:   name / handle / bio
 *
 * 每维各最多 8 条;all 模式下返回全部分类
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { REVIEW_FILTER_ENABLED } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';

const PER = 8;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const kind = url.searchParams.get('kind') || 'all';

  if (!q) {
    return NextResponse.json({
      ok: true,
      data: { q, posts: [], species: [], boards: [], users: [] },
    });
  }

  const wantPosts = kind === 'all' || kind === 'posts';
  const wantSpecies = kind === 'all' || kind === 'species';
  const wantBoards = kind === 'all' || kind === 'boards';
  const wantUsers = kind === 'all' || kind === 'users';

  const [posts, species, boards, users] = await Promise.all([
    wantPosts
      ? prisma.post.findMany({
          where: {
            deleted: false,
            ...(REVIEW_FILTER_ENABLED ? { reviewStatus: 'published' } : {}),
            OR: [
              { title: { contains: q } },
              { content: { contains: q } },
            ],
          },
          select: {
            id: true,
            title: true,
            content: true,
            cover: true,
            createdAt: true,
            views: true,
            author: { select: { id: true, name: true, handle: true, avatar: true } },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
          take: kind === 'posts' ? 30 : PER,
        })
      : Promise.resolve([]),
    wantSpecies
      ? prisma.species.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { latinName: { contains: q } },
            ],
          },
          include: { genus: { include: { category: true } } },
          orderBy: [{ posts: { _count: 'desc' } }, { name: 'asc' }],
          take: kind === 'species' ? 30 : PER,
        })
      : Promise.resolve([]),
    wantBoards
      ? prisma.category.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          },
          orderBy: { name: 'asc' },
          take: kind === 'boards' ? 30 : PER,
        })
      : Promise.resolve([]),
    wantUsers
      ? prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q } },
              { handle: { contains: q } },
              { bio: { contains: q } },
            ],
          },
          select: {
            id: true,
            name: true,
            handle: true,
            avatar: true,
            bio: true,
            level: true,
            _count: { select: { posts: true, followers: true } },
          },
          orderBy: { updatedAt: 'desc' },
          take: kind === 'users' ? 30 : PER,
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      q,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
        excerpt: (p.content || '').replace(/<[^>]+>/g, '').slice(0, 80),
        cover: p.cover,
        createdAt: p.createdAt,
        views: p.views,
        likes: p._count.likes,
        comments: p._count.comments,
        author: p.author,
      })),
      species: species.map((s) => ({
        id: s.id,
        name: s.name,
        latinName: s.latinName,
        cover: s.cover,
        url: `/board/${s.genus.category.slug}/${s.genus.slug}/${s.slug}`,
      })),
      boards: boards.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        cover: b.cover,
      })),
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        handle: u.handle,
        avatar: u.avatar,
        bio: u.bio,
        level: u.level,
        posts: u._count.posts,
        followers: u._count.followers,
      })),
    },
  });
}
