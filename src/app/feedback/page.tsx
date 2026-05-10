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

export const metadata: Metadata = {
  title: '意见反馈 · 肉友社',
  description: '把你遇到的问题、想要的功能、内容建议告诉我们,管理员收到后会在私信里回复',
};

export default function FeedbackPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-800">📮 意见反馈</h1>
          <p className="mt-1.5 text-sm text-leaf-700/70">
            遇到问题、有功能建议、或对内容有意见?直接告诉我们 — 管理员收到后会在
            <strong className="px-1 text-ink-800">私信</strong>
            里回复你。
          </p>
        </div>

        <FeedbackForm />

        <div className="mt-6 rounded-lg bg-leaf-50/40 p-4 text-xs leading-6 text-leaf-700/70">
          <div className="mb-1 font-medium text-ink-700">📌 提交说明</div>
          <ul className="list-disc space-y-0.5 pl-4">
            <li>同账号 60 秒内只能提交一条,1 小时内最多 5 条</li>
            <li>反馈以私信发给管理员,你可在站内信里查看回复</li>
            <li>涉及账号/支付/隐私问题,请同时邮件至 admin@plantcommunity.cn</li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}
