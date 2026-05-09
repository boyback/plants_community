import type { MetadataRoute } from 'next';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://plantcommunity.cn';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/', // 后端接口不索引
          '/admin/', // 后台
          '/settings/', // 个人设置
          '/messages', // 私信
          '/notifications',
          '/checkout/', // 支付流程
          '/login', // 登录
          '/register',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
