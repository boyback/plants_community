import { cn } from '@/lib/utils';
import styles from './VipBadge.module.scss';
import { cx } from '@/lib/style-utils';



/** 大会员小标识 */
export function VipBadge({
  size = 'sm',
  lifetime,
  shareholder,
  className





}: {size?: 'xs' | 'sm' | 'md';lifetime?: boolean;shareholder?: boolean;className?: string;}) {
  const sizeCls =
  size === 'xs' ? cx(styles.r_e0988086, styles.r_d8e0e382, styles.r_c6e52cdb, styles.r_a3899220) :

  size === 'md' ? cx(styles.r_359090c2, styles.r_d5eab218, styles.r_465609a2, styles.r_44ee8ba0) : cx(styles.r_1dc571a3, styles.r_45d82811, styles.r_c6e52cdb, styles.r_a3899220);



  return (
    <span
      className={cn(cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_ac204c10, styles.r_69450ef1, styles.r_117ec720, styles.r_09ace3a4), cx(styles.r_6ae7db2c, styles.r_96b881c8, styles.r_f61dcff4, styles.r_db539fdb, styles.r_67e74965), styles.r_d15271fa,



      sizeCls,
      className
      )}
      title={lifetime ? '终身大会员' : shareholder ? '社区股东(老会员)' : '大会员'}>

      <span aria-hidden>{lifetime ? '∞' : '👑'}</span>
      {lifetime ? 'LIFETIME' : shareholder ? '股东' : 'VIP'}
    </span>);

}