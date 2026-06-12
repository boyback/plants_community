import { Shell } from '@/components/layout/Shell';
import Link from 'next/link';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



const guides = [
{
  icon: '✍️',
  title: '发帖指南',
  desc: '如何在社区分享你的多肉心得',
  href: '/guide/post',
  tags: ['发帖', '图片', '标签']
},
{
  icon: '📷',
  title: '记录贴指南',
  desc: '用时间线记录多肉的成长历程',
  href: '/guide/journal',
  tags: ['记录', '时间线', '浇水']
},
{
  icon: '🌱',
  title: '品种打分',
  desc: '为喜欢的品种打分并分享养护经验',
  href: '/guide/species',
  tags: ['品种', '打分', '养护']
},
{
  icon: '🔍',
  title: '搜索功能',
  desc: '快速找到你感兴趣的内容',
  href: '/guide/search',
  tags: ['搜索', '话题', '品种']
},
{
  icon: '💬',
  title: '互动指南',
  desc: '点赞、评论、关注功能详解',
  href: '/guide/interaction',
  tags: ['评论', '点赞', '关注']
},
{
  icon: '📱',
  title: 'APP 下载',
  desc: '随时随地记录你的多肉时光',
  href: '/app',
  tags: ['APP', '离线', '提醒']
}];


export default function GuidePage() {
  return (
    <Shell>
      <div className={cx(styles.r_fa3f7111, styles.r_0e12dc7d, styles.r_a1f611f0, styles.r_f0faeb26)}>
        <div className={cx(styles.r_a8b152c0, styles.r_ca6bf630)}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5, styles.r_a77ed4d9)}>🌿 新手指南</h1>
          <p className={cx(styles.r_fc7473ca, styles.r_69335b95)}>快速上手肉友社，玩转社区功能</p>
        </div>

        <div className={cx(styles.r_f3c543ad, styles.r_0c3bc985, styles.r_e00ad816)}>
          {guides.map((guide) =>
          <Link
            key={guide.href}
            href={guide.href}
            className={cx(styles.r_c07e54fd, styles.r_9e85ac05, styles.r_b8627687)}>

              <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_1004c0c3)}>
                <span className={styles.r_3febee09}>{guide.icon}</span>
                <div className={cx(styles.r_36e579c0, styles.r_7e0b7cdf)}>
                  <h3 className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5, styles.r_65281709)}>{guide.title}</h3>
                  <p className={cx(styles.r_fc7473ca, styles.r_e3622902, styles.r_1bb88326)}>{guide.desc}</p>
                  <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_58284b4e)}>
                    {guide.tags.map((tag) =>
                  <span
                    key={tag}
                    className={cx(styles.r_ac204c10, styles.r_7ebecbb6, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>

                        {tag}
                      </span>
                  )}
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className={cx(styles.r_65cf08ba, styles.r_0478c89a, styles.r_0c5e9137, styles.r_9ac94195, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_ca6bf630)}>
          <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_e7eab4cb, styles.r_a77ed4d9)}>有疑问？</h2>
          <p className={cx(styles.r_fc7473ca, styles.r_69335b95, styles.r_da019856)}>
            欢迎在社区提问，热心的肉友们会帮你解答
          </p>
          <Link
            href="/"
            className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e)}>

            去社区看看 →
          </Link>
        </div>
      </div>
    </Shell>);

}