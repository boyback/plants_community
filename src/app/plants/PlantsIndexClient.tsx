'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
import type { PlantSpecies } from '@/lib/types';
import styles from './PlantsIndexClient.module.scss';
import { cx } from '@/lib/style-utils';



type PlantItem = PlantSpecies & {detailHref?: string;};

/**
 * family 过滤键采用 latin-ish key,label 走 i18n:
 * 命中策略:p.family 里若含该 key 去掉 "aceae" 的词根,或直接含该 key,都算命中。
 * 为兼容现有 mock(中文家族名),同时把 zh 家族汉字硬编码作为备胎匹配。
 */
const FAMILY_OPTIONS: Array<{key: string;zh: string;}> = [
{ key: 'all', zh: '' },
{ key: 'Crassulaceae', zh: '景天' },
{ key: 'Aizoaceae', zh: '番杏' },
{ key: 'Liliaceae', zh: '百合' },
{ key: 'Cactaceae', zh: '仙人掌' },
{ key: 'Euphorbiaceae', zh: '大戟' }];


const DIFFICULTY = [0, 1, 2, 3, 4, 5] as const;

export function PlantsIndexClient({ plants }: {plants: PlantItem[];}) {
  const { t } = useI18n();
  const [familyKey, setFamilyKey] = useState('all');
  const [difficulty, setDifficulty] = useState(0);
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
    plants.filter((p) => {
      if (familyKey !== 'all') {
        const opt = FAMILY_OPTIONS.find((f) => f.key === familyKey)!;
        // 中文 family 匹配:含 zh 词根;同时 Latin 匹配:family 里含 key 词根
        const hit =
        opt.zh && p.family.includes(opt.zh) ||
        opt.key && p.family.toLowerCase().includes(opt.key.toLowerCase());
        if (!hit) return false;
      }
      if (difficulty !== 0 && p.difficulty !== difficulty) return false;
      if (q && !(p.name.includes(q) || p.latinName.toLowerCase().includes(q.toLowerCase())))
      return false;
      return true;
    }),
    [plants, familyKey, difficulty, q]
  );

  const familyLabel = (key: string) =>
  key === 'all' ? t('plants.all') : t(`plants.family.${key}`);

  return (
    <>
      <div className={cx(styles.r_b6777c6d, styles.r_60fbb771, styles.r_8dddea07, styles.r_1004c0c3, styles.r_4102dddf, styles.r_bf60a82f, styles.r_db6dd3a2)}>
        <div>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>{t('plants.title')}</h1>
          <p className={cx(styles.r_fc7473ca, styles.r_69335b95)}>{t('plants.subtitle')}</p>
        </div>
        <div className={cx(styles.r_d89972fe, styles.r_6da6a3c3, styles.r_112e3eea)}>
          <Icon
            name="search"
            size={14}
            className={cx(styles.r_da4dbfbc, styles.r_22e59b72, styles.r_d694ba66, styles.r_36b381be, styles.r_eb16169c)} />

          <input
            className={styles.r_e4af8854}
            placeholder={t('plants.searchPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)} />

        </div>
      </div>

      <div className={cx(styles.r_da019856, styles.r_6f7e013d)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span className={cx(styles.r_359090c2, styles.r_69335b95, styles.r_61816240)}>{t('plants.familyLabel')}</span>
          {FAMILY_OPTIONS.map((f) =>
          <Chip key={f.key} active={familyKey === f.key} onClick={() => setFamilyKey(f.key)}>
              {familyLabel(f.key)}
            </Chip>
          )}
        </div>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <span className={cx(styles.r_359090c2, styles.r_69335b95, styles.r_61816240)}>{t('plants.difficultyLabel')}</span>
          {DIFFICULTY.map((d) =>
          <Chip key={d} active={difficulty === d} onClick={() => setDifficulty(d)}>
              {d === 0 ? t('plants.all') : '★'.repeat(d)}
            </Chip>
          )}
        </div>
      </div>

      <div className={cx(styles.r_1bb88326, styles.r_359090c2, styles.r_69335b95)}>{t('plants.totalCount', { n: list.length })}</div>

      <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_0c3bc985, styles.r_ab1b20c2, styles.r_4558bce6)}>
        {list.map((p) =>
        <Link
          key={p.id}
          href={p.detailHref ?? `/plants/${p.slug}`}
          className={cx(styles.r_64292b1c, styles.r_2cd02d11, styles.r_b8627687, styles.r_9c02094c)}>

            <div className={cx(styles.r_d89972fe, styles.r_357868ab, styles.r_2cd02d11, styles.r_7ebecbb6)}>
              <Image
              src={p.cover}
              alt={p.name}
              fill
              sizes="(max-width:768px) 50vw, 300px"
              className={cx(styles.r_7d85d0c2, styles.r_eadef238, styles.r_84432211, styles.r_1a9195e1)}
              unoptimized />

              <div className={cx(styles.r_da4dbfbc, styles.r_d83be576, styles.r_9a2db8f9, styles.r_ac204c10, styles.r_6c21de57, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_5f6a59f1)}>
                {'★'.repeat(p.difficulty)}
              </div>
            </div>
            <div className={styles.r_eb6e8b88}>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{p.name}</div>
              <div className={cx(styles.r_15e1b1f4, styles.r_f283ea9b, styles.r_d058ca6d, styles.r_90665ca6, styles.r_69335b95)}>
                {p.latinName}
              </div>
              <div className={cx(styles.r_aac62f0e, styles.r_f283ea9b, styles.r_d058ca6d, styles.r_aa27a041)}>{p.family}</div>
            </div>
          </Link>
        )}
      </div>

      {list.length === 0 &&
      <div className={cx(styles.r_31f25533, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_d2fa6cb5, styles.r_f2fa03b2, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>🔍</div>
          <div className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_399e11a5)}>{t('plants.empty')}</div>
          <div className={cx(styles.r_359090c2, styles.r_69335b95)}>{t('plants.emptyDesc')}</div>
        </div>
      }
    </>);

}

function Chip({
  children,
  active,
  onClick




}: {children: React.ReactNode;active?: boolean;onClick?: () => void;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(cx(styles.r_ac204c10, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_ceb69a6b),

      active ? cx(styles.r_d3b27cd9, styles.r_45499621, styles.r_72a4c7cd) : cx(styles.r_691861bc, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_5756b7b4)


      )}>

      {children}
    </button>);

}