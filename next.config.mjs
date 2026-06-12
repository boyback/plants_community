/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Docker 部署:Next.js 自带的 standalone 模式,只把运行所需文件复制到 .next/standalone
  // 避免镜像里塞 node_modules 全量
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'cdn.plantcommunity.cn' },
    ],
  },
};

export default nextConfig;
