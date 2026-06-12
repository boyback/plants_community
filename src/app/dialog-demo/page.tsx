'use client';

import { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ConfirmDialogStyle1, ConfirmDialogStyle2, ConfirmDialogStyle3 } from '@/components/ui/DialogStyles';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export default function DialogDemoPage() {
  const [style1Open, setStyle1Open] = useState(false);
  const [style2Open, setStyle2Open] = useState(false);
  const [style3Open, setStyle3Open] = useState(false);

  return (
    <Shell>
      <div className={cx(styles.r_0e12dc7d, styles.r_cf3893e3)}>
        <div className={styles.r_845f5336}>
          <h1 className={cx(styles.r_b6777c6d, styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>弹窗风格选择</h1>
          <p className={cx(styles.r_a8b152c0, styles.r_fc7473ca, styles.r_02eb621e)}>
            点击下方按钮预览3种不同风格的弹窗，选择你喜欢的风格
          </p>

          <div className={styles.r_b3542e05}>
            {/* 风格1：极简轻量型 */}
            <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0478c89a)}>
              <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>风格1：极简轻量型</h2>
                <span className={cx(styles.r_ac204c10, styles.r_f2b23104, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_5f6a59f1)}>
                  干扰性最小
                </span>
              </div>
              <ul className={cx(styles.r_da019856, styles.r_da7c36cd, styles.r_fc7473ca, styles.r_02eb621e)}>
                <li>• 小尺寸</li>
                <li>• 淡色半透明背景</li>
                <li>• 轻量阴影</li>
                <li>• 小字号</li>
                <li>• 适合：快速确认、非关键操作</li>
              </ul>
              <button
                onClick={() => setStyle1Open(true)}
                className="btn-primary">

                预览风格1
              </button>
            </div>

            {/* 风格2：现代卡片型 */}
            <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0478c89a)}>
              <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>风格2：现代卡片型</h2>
                <span className={cx(styles.r_ac204c10, styles.r_2eb3df8f, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_65b7dd19)}>
                  推荐
                </span>
              </div>
              <ul className={cx(styles.r_da019856, styles.r_da7c36cd, styles.r_fc7473ca, styles.r_02eb621e)}>
                <li>• 中等尺寸</li>
                <li>• 适中半透明背景</li>
                <li>• 清晰阴影</li>
                <li>• 标准字号</li>
                <li>• 适合：大多数场景、日常操作</li>
              </ul>
              <button
                onClick={() => setStyle2Open(true)}
                className="btn-primary">

                预览风格2
              </button>
            </div>

            {/* 风格3：专业强调型 */}
            <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0478c89a)}>
              <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
                <h2 className={cx(styles.r_42536e69, styles.r_e83a7042, styles.r_399e11a5)}>风格3：专业强调型</h2>
                <span className={cx(styles.r_ac204c10, styles.r_735dd972, styles.r_0e17f2bd, styles.r_660d2eff, styles.r_359090c2, styles.r_2689f395, styles.r_85d79ebf)}>
                  重要操作
                </span>
              </div>
              <ul className={cx(styles.r_da019856, styles.r_da7c36cd, styles.r_fc7473ca, styles.r_02eb621e)}>
                <li>• 较大尺寸</li>
                <li>• 深色半透明背景</li>
                <li>• 强烈阴影 + 边框</li>
                <li>• 较大字号</li>
                <li>• 适合：重要确认、危险操作、需要特别注意的场景</li>
              </ul>
              <button
                onClick={() => setStyle3Open(true)}
                className="btn-primary">

                预览风格3
              </button>
            </div>
          </div>

          {/* 对比表格 */}
          <div className={cx(styles.r_4e5d2af5, styles.r_1384f66f)}>
            <table className={cx(styles.r_6da6a3c3, styles.r_fc7473ca)}>
              <thead>
                <tr className={cx(styles.r_65fdbade, styles.r_88b684d2)}>
                  <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_e83a7042, styles.r_399e11a5)}>特性</th>
                  <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_e83a7042, styles.r_399e11a5)}>风格1</th>
                  <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_e83a7042, styles.r_399e11a5)}>风格2</th>
                  <th className={cx(styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_2eba0d65, styles.r_e83a7042, styles.r_399e11a5)}>风格3</th>
                </tr>
              </thead>
              <tbody className={styles.r_02eb621e}>
                <tr className={cx(styles.r_65fdbade, styles.r_5ff6a729)}>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>尺寸</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>小（320px）</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>中（448px）</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>大（512px）</td>
                </tr>
                <tr className={cx(styles.r_65fdbade, styles.r_5ff6a729)}>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>背景遮罩</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>20%</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>30%</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>50%</td>
                </tr>
                <tr className={cx(styles.r_65fdbade, styles.r_5ff6a729)}>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>视觉重量</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>轻</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>中</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>重</td>
                </tr>
                <tr className={cx(styles.r_65fdbade, styles.r_5ff6a729)}>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>干扰性</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>最小</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>适中</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>较强</td>
                </tr>
                <tr>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>适用场景</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>快速确认</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>日常操作</td>
                  <td className={cx(styles.r_f0faeb26, styles.r_1b2d54a3)}>重要决策</td>
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
        danger={true} />


      {/* 风格2演示 */}
      <ConfirmDialogStyle2
        open={style2Open}
        onClose={() => setStyle2Open(false)}
        onConfirm={() => alert('你选择了风格2')}
        title="删除确认"
        message="确定要删除这篇帖子吗？此操作无法撤销。"
        confirmText="删除"
        danger={true} />


      {/* 风格3演示 */}
      <ConfirmDialogStyle3
        open={style3Open}
        onClose={() => setStyle3Open(false)}
        onConfirm={() => alert('你选择了风格3')}
        title="删除确认"
        message="确定要删除这篇帖子吗？此操作无法撤销，删除后将无法恢复。"
        confirmText="确认删除"
        danger={true} />

    </Shell>);

}