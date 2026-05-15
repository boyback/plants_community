'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ConfirmDialogStyle1, ConfirmDialogStyle2, ConfirmDialogStyle3 } from '@/components/ui/DialogStyles';

export default function DialogDemoPage() {
  const [style1Open, setStyle1Open] = useState(false);
  const [style2Open, setStyle2Open] = useState(false);
  const [style3Open, setStyle3Open] = useState(false);

  return (
    <Shell>
      <div className="mx-auto max-w-4xl">
        <div className="card p-8">
          <h1 className="mb-6 text-2xl font-bold text-ink-800">弹窗风格选择</h1>
          <p className="mb-8 text-sm text-ink-600">
            点击下方按钮预览3种不同风格的弹窗，选择你喜欢的风格
          </p>

          <div className="space-y-6">
            {/* 风格1：极简轻量型 */}
            <div className="rounded-xl border border-leaf-100 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-800">风格1：极简轻量型</h2>
                <span className="rounded-full bg-leaf-100 px-3 py-1 text-xs font-medium text-leaf-700">
                  干扰性最小
                </span>
              </div>
              <ul className="mb-4 space-y-1 text-sm text-ink-600">
                <li>• 小尺寸（max-w-xs）</li>
                <li>• 淡色半透明背景（bg-black/20）</li>
                <li>• 轻量阴影（shadow-sm）</li>
                <li>• 小字号（text-xs/text-sm）</li>
                <li>• 适合：快速确认、非关键操作</li>
              </ul>
              <button
                onClick={() => setStyle1Open(true)}
                className="btn-primary"
              >
                预览风格1
              </button>
            </div>

            {/* 风格2：现代卡片型 */}
            <div className="rounded-xl border border-leaf-100 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-800">风格2：现代卡片型</h2>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  推荐
                </span>
              </div>
              <ul className="mb-4 space-y-1 text-sm text-ink-600">
                <li>• 中等尺寸（max-w-md）</li>
                <li>• 适中半透明背景（bg-black/30）</li>
                <li>• 清晰阴影（shadow-lg）</li>
                <li>• 标准字号（text-sm/text-base）</li>
                <li>• 适合：大多数场景、日常操作</li>
              </ul>
              <button
                onClick={() => setStyle2Open(true)}
                className="btn-primary"
              >
                预览风格2
              </button>
            </div>

            {/* 风格3：专业强调型 */}
            <div className="rounded-xl border border-leaf-100 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink-800">风格3：专业强调型</h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  重要操作
                </span>
              </div>
              <ul className="mb-4 space-y-1 text-sm text-ink-600">
                <li>• 较大尺寸（max-w-lg）</li>
                <li>• 深色半透明背景（bg-black/50）</li>
                <li>• 强烈阴影 + 边框（shadow-2xl + border-2）</li>
                <li>• 较大字号（text-sm/text-lg）</li>
                <li>• 适合：重要确认、危险操作、需要特别注意的场景</li>
              </ul>
              <button
                onClick={() => setStyle3Open(true)}
                className="btn-primary"
              >
                预览风格3
              </button>
            </div>
          </div>

          {/* 对比表格 */}
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-leaf-100">
                  <th className="px-4 py-3 text-left font-semibold text-ink-800">特性</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-800">风格1</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-800">风格2</th>
                  <th className="px-4 py-3 text-left font-semibold text-ink-800">风格3</th>
                </tr>
              </thead>
              <tbody className="text-ink-600">
                <tr className="border-b border-leaf-50">
                  <td className="px-4 py-3">尺寸</td>
                  <td className="px-4 py-3">小（320px）</td>
                  <td className="px-4 py-3">中（448px）</td>
                  <td className="px-4 py-3">大（512px）</td>
                </tr>
                <tr className="border-b border-leaf-50">
                  <td className="px-4 py-3">背景遮罩</td>
                  <td className="px-4 py-3">20%</td>
                  <td className="px-4 py-3">30%</td>
                  <td className="px-4 py-3">50%</td>
                </tr>
                <tr className="border-b border-leaf-50">
                  <td className="px-4 py-3">视觉重量</td>
                  <td className="px-4 py-3">轻</td>
                  <td className="px-4 py-3">中</td>
                  <td className="px-4 py-3">重</td>
                </tr>
                <tr className="border-b border-leaf-50">
                  <td className="px-4 py-3">干扰性</td>
                  <td className="px-4 py-3">最小</td>
                  <td className="px-4 py-3">适中</td>
                  <td className="px-4 py-3">较强</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">适用场景</td>
                  <td className="px-4 py-3">快速确认</td>
                  <td className="px-4 py-3">日常操作</td>
                  <td className="px-4 py-3">重要决策</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 风格1演示 */}
      <ConfirmDialogStyle1
        open={style1Open}
        onClose={() => setStyle1Open(false)}
        onConfirm={() => alert('你选择了风格1')}
        title="删除确认"
        message="确定要删除这篇帖子吗？"
        confirmText="删除"
        danger={true}
      />

      {/* 风格2演示 */}
      <ConfirmDialogStyle2
        open={style2Open}
        onClose={() => setStyle2Open(false)}
        onConfirm={() => alert('你选择了风格2')}
        title="删除确认"
        message="确定要删除这篇帖子吗？此操作无法撤销。"
        confirmText="删除"
        danger={true}
      />

      {/* 风格3演示 */}
      <ConfirmDialogStyle3
        open={style3Open}
        onClose={() => setStyle3Open(false)}
        onConfirm={() => alert('你选择了风格3')}
        title="删除确认"
        message="确定要删除这篇帖子吗？此操作无法撤销，删除后将无法恢复。"
        confirmText="确认删除"
        danger={true}
      />
    </Shell>
  );
}
