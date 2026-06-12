'use client';

import Link from 'next/link';
import { useI18n } from '@/i18n/I18nContext';
import styles from './TopicsCard.module.scss';
import { cx } from '@/lib/style-utils';



const topics = [
{ tag: '度夏', count: 1243, hot: true },
{ tag: '配土', count: 842 },
{ tag: '玉露', count: 612 },
{ tag: '叶插', count: 431, hot: true },
{ tag: '生石花', count: 378 },
{ tag: '仙人球', count: 329 },
{ tag: '胧月', count: 287 },
{ tag: '黑腐', count: 184 }];


export function TopicsCard() {
  const { t } = useI18n();
  return (
    <div className={styles.r_8e63407b}>
      <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
        <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>🔥 {t('home.topics.title')}</div>
        <Link href="/topics" className={cx(styles.r_d058ca6d, styles.r_5f6a59f1, styles.r_f673f4a7)}>
          {t('home.topics.moreLink')}
        </Link>
      </div>
      <ul className={styles.r_5a250822}>
        {topics.map((item, i) =>
        <li key={item.tag}>
            <Link
            href={`/topic/${encodeURIComponent(item.tag)}`}
            className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_0c5e9137, styles.r_d5eab218, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_5756b7b4)}>

              <span className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <span
                className={
                i < 3 ? cx(styles.r_c5d9aaf6, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_421ac2be, styles.r_45499621, styles.r_d058ca6d, styles.r_69450ef1, styles.r_72a4c7cd) : cx(styles.r_c5d9aaf6, styles.r_cd0d9c51, styles.r_72470489, styles.r_67d66567, styles.r_421ac2be, styles.r_7ebecbb6, styles.r_d058ca6d, styles.r_69450ef1, styles.r_b17d6a13)


                }>

                  {i + 1}
                </span>
                <span>#{item.tag}</span>
                {item.hot &&
              <span className={cx(styles.r_07389a77, styles.r_0759a0f1, styles.r_d8e0e382, styles.r_1dc571a3, styles.r_595fceba)}>HOT</span>
              }
              </span>
              <span className={cx(styles.r_d058ca6d, styles.r_a1a0ad0b)}>{item.count}</span>
            </Link>
          </li>
        )}
      </ul>
    </div>);

}