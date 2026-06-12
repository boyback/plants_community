import Link from 'next/link';
import styles from './not-found.module.scss';
import { cx } from '@/lib/style-utils';



export default function NotFound() {
  return (
    <div className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_793346c7, styles.r_3960ffc2, styles.r_86843cf1, styles.r_f92d0236)}>
      <div className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_0917b4a4, styles.r_2cd02d11)}>
        <div className={cx(styles.r_da4dbfbc, styles.r_e632769a, styles.r_d694ba66, styles.r_f00d9574, styles.r_23600397, styles.r_efaa0701, styles.r_36b381be, styles.r_ac204c10, styles.r_4d592586, styles.r_4b5e775b)} />
      </div>
      <div className={styles.r_ca6bf630}>
        <div className={styles.r_965f6544}>🌵</div>
        <h1 className={cx(styles.r_0ab86672, styles.r_751fb0d1, styles.r_69450ef1, styles.r_399e11a5)}>404</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>这棵多肉可能已经搬去别的阳台了</p>
        <Link href="/" className={cx(styles.r_31f25533, styles.r_52083e7d)}>
          回到首页
        </Link>
      </div>
    </div>);

}