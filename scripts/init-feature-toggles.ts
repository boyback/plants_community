import { prisma } from '../src/lib/db';

async function main() {
  console.log('初始化功能开关配置...');

  const configs = [
    {
      key: 'feature.shaitu.enabled',
      value: JSON.stringify(true),
      description: '晒图广场功能开关',
    },
    {
      key: 'feature.market.enabled',
      value: JSON.stringify(true),
      description: '交易市场功能开关',
    },
    {
      key: 'feature.contests.enabled',
      value: JSON.stringify(false),
      description: '摄影大赛功能开关',
    },
  ];

  for (const config of configs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: {
        key: config.key,
        value: config.value,
      },
    });
    console.log(`✓ 配置: ${config.key} = ${config.value}`);
  }

  console.log('\n功能开关配置完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
