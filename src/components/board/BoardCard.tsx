import Link from 'next/link';
import Image from 'next/image';
import type { Board } from '@/lib/types';
import { formatNumber, boardUrl } from '@/lib/utils';
import { I18nText } from '@/components/ui/I18nText';
import styles from './BoardCard.module.scss';
import { cx } from '@/lib/style-utils';



export function BoardCard({ board }: {board: Board;}) {
  return (
    <Link
      href={boardUrl(board)}
      className={cx(styles.r_64292b1c, styles.r_2cd02d11, styles.r_b8627687, styles.r_9c02094c)}>

      <div className={cx(styles.r_d89972fe, styles.r_89a62219, styles.r_2cd02d11, styles.r_7ebecbb6)}>
        <Image
          src={board.cover}
          alt={board.name}
          fill
          sizes="(max-width:768px) 100vw, 400px"
          className={cx(styles.r_7d85d0c2, styles.r_4f5874c5, styles.r_eadef238, styles.r_84432211, styles.r_1a9195e1)}
          unoptimized />

        <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_79257b8c, styles.r_c975410d, styles.r_de7dd59b, styles.r_0fe2b3da)} />
        <div className={cx(styles.r_da4dbfbc, styles.r_49af11eb, styles.r_22e59b72, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_72a4c7cd)}>
          <span className={styles.r_3febee09}>{board.icon}</span>
          <span className={cx(styles.r_42536e69, styles.r_e83a7042)}>{board.name}</span>
        </div>
      </div>
      <div className={styles.r_8e63407b}>
        <p className={cx(styles.r_054cb4e3, styles.r_359090c2, styles.r_21d33c50)}>{board.description}</p>
        <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_d058ca6d, styles.r_69335b95)}>
          <span>👥 <I18nText k="board.stats.members" vars={{ n: formatNumber(board.members) }} /></span>
          <span>📝 <I18nText k="board.stats.posts" vars={{ n: formatNumber(board.posts) }} /></span>
        </div>
      </div>
    </Link>);

}