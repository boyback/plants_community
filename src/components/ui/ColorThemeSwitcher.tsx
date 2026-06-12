'use client';

import { useColorTheme } from '@/context/ColorThemeContext';
import { Icon } from '@/components/ui/Icon';
import { useHoverOpen } from '@/lib/hooks/useHoverOpen';
import { cn } from '@/lib/utils';
import styles from './ColorThemeSwitcher.module.scss';
import { cx } from '@/lib/style-utils';



/**
 * 配色主题切换器(头部用)
 * - **悬浮触发**:鼠标 hover 触发按钮即展开,移开 150ms 后关闭
 * - 12 主题色板 + 明/暗模式切换
 * - 选中后立即生效,保存 localStorage
 */
export function ColorThemeSwitcher({ className }: {className?: string;}) {
  const { theme, meta, setTheme, themes } = useColorTheme();
  const { open, bind, close } = useHoverOpen();

  return (
    <div className={cn(cx(styles.r_d89972fe, styles.r_bb0c4bfc), className)} {...bind}>
      <button
        type="button"
        title={`主题:${meta.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(styles.r_52083e7d, styles.r_426b8b75, styles.r_28ae52cc, styles.r_3960ffc2, styles.r_86843cf1, styles.r_58284b4e, styles.r_a217b4ea, styles.r_0b91436d, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5, styles.r_56bf8ae8, styles.r_5756b7b4, styles.r_5eca0425)}>

        <Icon name="palette" size={17} />
        <span className={cx(styles.r_99d72c7f, styles.r_ee3c1259)}>主题</span>
      </button>

      {open &&
      <div className={cx(styles.r_da4dbfbc, styles.r_d8cdcad2, styles.r_5e8a03e0, styles.r_181b2866, styles.r_50d0d216, styles.r_06950372, styles.r_2cd02d11, styles.r_68f2db62, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6e8b88, styles.r_21b12502)}>
          <div className={cx(styles.r_a77ed4d9, styles.r_359090c2, styles.r_e83a7042, styles.r_399e11a5)}>配色主题</div>

          <div className={cx(styles.r_f3c543ad, styles.r_c6a5b744, styles.r_8e75e3db, styles.r_58284b4e, styles.r_92bf82f4, styles.r_1811324b)}>
            {themes.map((t) => {
            const active = t.key === theme;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTheme(t.key);
                  close();
                }}
                className={cn(cx(styles.r_64292b1c, styles.r_60fbb771, styles.r_8dddea07, styles.r_60541e1e, styles.r_44ee8ba0, styles.r_a217b4ea, styles.r_65935df5, styles.r_7660b450, styles.r_2eba0d65, styles.r_0fe7d7d8),

                active ? cx(styles.r_d3b27cd9, styles.r_a8a62ca4) : cx(styles.r_88b684d2, styles.r_a5c39c39)


                )}>

                  <div
                  className={cx(styles.r_60fbb771, styles.r_cd0d9c51, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_2cd02d11, styles.r_421ac2be, styles.r_3daca9af, styles.r_1e4905f7)}
                  style={{ background: t.swatch.bg }}>

                    <span
                    className={cx(styles.r_0214b4b3, styles.r_668b21aa, styles.r_b7ce0d2f)}
                    style={{ background: t.swatch.primary }} />

                  </div>
                  <div className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e)}>
                    <span className={cx(styles.r_f283ea9b, styles.r_359090c2, styles.r_2689f395, styles.r_399e11a5)}>
                      {t.logoEmoji} {t.name}
                    </span>
                    {active &&
                  <span className={cx(styles.r_f3c543ad, styles.r_7fc7f732, styles.r_bf600f8e, styles.r_012fbd12, styles.r_67d66567, styles.r_ac204c10, styles.r_45499621, styles.r_e0988086, styles.r_72a4c7cd)}>
                        ✓
                      </span>
                  }
                  </div>
                  <div className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1dc571a3, styles.r_69335b95)}>
                    <span className={styles.r_f283ea9b}>{t.desc}</span>
                    <span className={cx(styles.r_f58b0257, styles.r_012fbd12, styles.r_07389a77, styles.r_d2717103, styles.r_d8e0e382, styles.r_e0988086, styles.r_6c4cc49e)}>
                      {t.vibe}
                    </span>
                  </div>
                </button>);

          })}
          </div>
        </div>
      }
    </div>);

}