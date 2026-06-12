/**
 * 全站底部 Footer
 *
 * 三块布局:
 *   1. 关于 — 站点定位、品牌、社区精神
 *   2. 法律 — 协议、隐私、Cookie、举报
 *   3. 备案 — ICP、公安、联系方式
 *
 * 注意:仅显示 ICP 备案号,不显示主体名(工信部站可查,自家站不主动暴露)
 */
import Link from 'next/link';
import styles from './SiteFooter.module.scss';
import { cx } from '@/lib/style-utils';



const SUPPORT_EMAIL = 'admin@plantcommunity.cn';

export function SiteFooter() {
  return (
    <footer className={cx(styles.r_65cf08ba, styles.r_b950dda2, styles.r_38748e06, styles.r_efb55408)}>
      <div className={cx(styles.r_0e12dc7d, styles.r_da310242, styles.r_f0faeb26, styles.r_a1f611f0, styles.r_2499ab8d)}>
        <div className={cx(styles.r_f3c543ad, styles.r_0d304f90, styles.r_e00ad816, styles.r_9a638cfe)}>
          {/* 1. 关于 */}
          <div>
            <div className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>🌿 肉友社</div>
            <p className={cx(styles.r_359090c2, styles.r_7054e276, styles.r_e3622902)}>
              一个让多肉爱好者交流养护、分享美图、记录成长的中文社区。
              欢迎新手入坑,也欢迎老玩家来切磋。
            </p>
          </div>

          {/* 2. 站务 */}
          <div>
            <div className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>站务</div>
            <ul className={cx(styles.r_5a250822, styles.r_359090c2, styles.r_e3622902)}>
              <li>
                <Link href="/changelog" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
                  更新日志
                </Link>
              </li>
              <li>
                <Link href="/feedback" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
                  意见反馈
                </Link>
              </li>
              <li>
                <Link href="/cookies" className={cx(styles.r_9825203a, styles.r_f673f4a7)}>
                  Cookie 政策
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=违法和不良信息举报`}
                  className={cx(styles.r_9825203a, styles.r_f673f4a7)}>

                  违法和不良信息举报
                </a>
              </li>
            </ul>
          </div>

          {/* 3. 联系 */}
          <div>
            <div className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>联系我们</div>
            <ul className={cx(styles.r_5a250822, styles.r_359090c2, styles.r_e3622902)}>
              <li>
                联系邮箱:{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={cx(styles.r_9825203a, styles.r_f673f4a7)}>

                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部分隔线 + 版权 */}
        <div className={cx(styles.r_31f25533, styles.r_b950dda2, styles.r_38748e06, styles.r_173fa8f0, styles.r_ca6bf630, styles.r_d058ca6d, styles.r_cd55e659)}>
          © {new Date().getFullYear()} 肉友社 · 仅供学习与交流 · 不构成任何专业养护或商业建议
        </div>
      </div>
    </footer>);

}