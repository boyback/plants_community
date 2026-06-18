import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getLevelExpConfigs } from '@/lib/permissions';
import { LevelExpManager } from './LevelExpManager';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function AdminPointsPage() {
  const me = await getCurrentUser();
  if (!me?.isSuperAdmin) {
    redirect('/');
  }

  const levelConfigs = await getLevelExpConfigs();

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>钻石调整</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_02eb621e)}>
          管理经验等级阈值，并说明钻石余额与经验值的用途边界。
        </p>
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_9a638cfe)}>
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>钻石余额</div>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
            用户可消费的余额，用于兑换皮肤、会员或交易相关抵扣。单个用户加减钻石在“用户权限”列表的“钻石”按钮里操作。
          </p>
        </div>
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>经验 EXP</div>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
            用户成长等级依据。签到、发帖、任务奖励等会增加经验，达到下方阈值后升级。
          </p>
        </div>
        <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_8e63407b)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>功能权限</div>
          <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>
            等级解锁哪些功能在“权限管理”里配置；这里配置的是升到某一级需要多少经验。
          </p>
        </div>
      </div>

      <LevelExpManager rows={levelConfigs} />
    </div>);

}
