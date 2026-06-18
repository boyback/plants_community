import { prisma } from '@/lib/db';
import { TaskRow } from './TaskRow';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ kind: 'asc' }, { orderIdx: 'asc' }]
  });
  const grouped: Record<string, typeof tasks> = {};
  for (const t of tasks) {
    (grouped[t.kind] ??= []).push(t);
  }

  return (
    <div className={styles.r_b43b4c08}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🎯 任务配置</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          编辑奖励与目标 · 停用的任务不在前台显示
        </p>
      </div>

      {(['daily', 'monthly', 'achievement'] as const).map((kind) => {
        const list = grouped[kind] ?? [];
        if (list.length === 0) return null;
        const label = kind === 'daily' ? '每日' : kind === 'monthly' ? '月度' : '成就';
        return (
          <section key={kind}>
            <h2 className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_eb6abb1f)}>
              {label} <span className={cx(styles.r_d058ca6d, styles.r_8ecebc9f, styles.r_7b89cd85)}>({list.length})</span>
            </h2>
            <div className={cx(styles.r_2cd02d11, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8)}>
              <table className={cx(styles.r_6da6a3c3, styles.r_359090c2)}>
                <thead className={cx(styles.r_ce27a834, styles.r_02eb621e)}>
                  <tr>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_baceed34)}>状态</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>标题</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65)}>触发事件</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>目标</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>钻石</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>EXP</th>
                    <th className={cx(styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_308fc069)}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => <TaskRow key={t.id} task={t} />)}
                </tbody>
              </table>
            </div>
          </section>);

      })}

      {tasks.length === 0 &&
      <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_358505cf, styles.r_5e10cdb8, styles.r_a4d0f420, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_7b89cd85)}>
          还没有任务(请先在 Prisma Studio / seed 脚本创建)
        </div>
      }
    </div>);

}
