import { Shell } from '@/components/layout/Shell';
import Link from 'next/link';

const guides = [
  {
    icon: '✍️',
    title: '发帖指南',
    desc: '如何在社区分享你的多肉心得',
    href: '/guide/post',
    tags: ['发帖', '图片', '标签'],
  },
  {
    icon: '📷',
    title: '记录贴指南',
    desc: '用时间线记录多肉的成长历程',
    href: '/guide/journal',
    tags: ['记录', '时间线', '浇水'],
  },
  {
    icon: '🌱',
    title: '品种打分',
    desc: '为喜欢的品种打分并分享养护经验',
    href: '/guide/species',
    tags: ['品种', '打分', '养护'],
  },
  {
    icon: '🔍',
    title: '搜索功能',
    desc: '快速找到你感兴趣的内容',
    href: '/guide/search',
    tags: ['搜索', '话题', '品种'],
  },
  {
    icon: '💬',
    title: '互动指南',
    desc: '点赞、评论、关注功能详解',
    href: '/guide/interaction',
    tags: ['评论', '点赞', '关注'],
  },
  {
    icon: '📱',
    title: 'APP 下载',
    desc: '随时随地记录你的多肉时光',
    href: '/app',
    tags: ['APP', '离线', '提醒'],
  },
];

export default function GuidePage() {
  return (
    <Shell>
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-ink-800 mb-2">🌿 新手指南</h1>
          <p className="text-sm text-leaf-700/70">快速上手肉友社，玩转社区功能</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.href}
              href={guide.href}
              className="card p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{guide.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-ink-800 mb-1">{guide.title}</h3>
                  <p className="text-sm text-ink-700/70 mb-3">{guide.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {guide.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-leaf-50 px-2 py-0.5 text-[10px] text-leaf-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-none bg-leaf-50/50 border border-leaf-100 text-center">
          <h2 className="text-lg font-semibold text-leaf-800 mb-2">有疑问？</h2>
          <p className="text-sm text-leaf-700/70 mb-4">
            欢迎在社区提问，热心的肉友们会帮你解答
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 btn-primary"
          >
            去社区看看 →
          </Link>
        </div>
      </div>
    </Shell>
  );
}