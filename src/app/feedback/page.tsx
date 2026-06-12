/**
 * 意见反馈独立页 /feedback
 *
 * - 已登录:展示反馈表单(类别 + 内容),提交 POST /api/feedback
 * - 未登录:引导去登录
 *
 * 与 FeedbackCard 弹窗共用同一份 API,但页面版面更宽松、有「最近反馈记录」入口暗示。
 */
import type { Metadata } from 'next';
import { Shell } from '@/components/layout/Shell';
import { FeedbackForm } from './FeedbackForm';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const metadata: Metadata = {
  title: '意见反馈 · 肉友社',
  description: '把你遇到的问题、想要的功能、内容建议告诉我们,管理员收到后会在私信里回复'
};

export default function FeedbackPage() {
  return (
    <Shell>
      <div className={cx(styles.r_0e12dc7d, styles.r_9ef2b581)}>
        <div className={styles.r_b6777c6d}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>📮 意见反馈</h1>
          <p className={cx(styles.r_aac62f0e, styles.r_fc7473ca, styles.r_69335b95)}>
            遇到问题、有功能建议、或对内容有意见?直接告诉我们 — 管理员收到后会在
            <strong className={cx(styles.r_d8e0e382, styles.r_399e11a5)}>私信</strong>
            里回复你。
          </p>
        </div>

        <FeedbackForm />

        <div className={cx(styles.r_31f25533, styles.r_5f22e64f, styles.r_efb55408, styles.r_8e63407b, styles.r_359090c2, styles.r_18550d59, styles.r_69335b95)}>
          <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_eb6abb1f)}>📌 提交说明</div>
          <ul className={cx(styles.r_1f33b438, styles.r_e2eedc57, styles.r_fdb4af3a)}>
            <li>同账号 60 秒内只能提交一条,1 小时内最多 5 条</li>
            <li>反馈以私信发给管理员,你可在站内信里查看回复</li>
            <li>涉及账号/支付/隐私问题,请同时邮件至 admin@plantcommunity.cn</li>
          </ul>
        </div>
      </div>
    </Shell>);

}