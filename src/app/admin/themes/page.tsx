import { THEME_REGISTRY, activeThemesAt } from '@/lib/themes';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  const now = new Date();
  const activeNow = activeThemesAt(now);
  const activeSet = new Set(activeNow.map((t) => t.slug));

  return (
    <div className={styles.r_3e7ce58d}>
      <div>
        <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>🎨 主题调度</h1>
        <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_02eb621e)}>
          当前时间 {now.toLocaleString("zh-CN")} · 共 {THEME_REGISTRY.length} 个主题,{activeNow.length} 个活跃
        </p>
      </div>

      <div className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_ae1aefda, styles.r_8e63407b, styles.r_359090c2, styles.r_5c6230d2)}>
        💡 主题目前基于代码里的日期窗口与农历表查询自动启用;此页仅为查看,如需立即启用某个节日主题,
        请编辑 <code className={cx(styles.r_07389a77, styles.r_5e10cdb8, styles.r_d8e0e382, styles.r_465609a2)}>src/lib/themes.ts</code> 的窗口配置。
      </div>

      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_e4d6f343, styles.r_19d9b25e)}>
        {THEME_REGISTRY.map((t) => {
          const active = activeSet.has(t.slug);
          return (
            <div
              key={t.slug}
              className={cx(
                styles.r_a217b4ea,
                styles.r_ca6bcd4b,
                styles.r_8e63407b,
                styles.r_359090c2,
                active ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_ed9d3d83) : cx(styles.r_358505cf, styles.r_5e10cdb8)
              )}
              style={
              active ?
              {
                background: `linear-gradient(135deg, ${t.decoration.accentFrom}15, ${t.decoration.accentTo}15)`
              } :
              undefined
              }>

              <div className={cx(styles.r_a77ed4d9, styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                <span className={styles.r_3febee09}>{t.decoration.logoBadge}</span>
                <div>
                  <div className={cx(styles.r_fc7473ca, styles.r_e83a7042)}>{t.name}</div>
                  <div className={cx(styles.r_1dc571a3, styles.r_7b89cd85, styles.r_0e65706b)}>{t.slug}</div>
                </div>
                {active &&
                <span className={cx(styles.r_fb56d9cf, styles.r_ac204c10, styles.r_45499621, styles.r_d5eab218, styles.r_465609a2, styles.r_1dc571a3, styles.r_2689f395, styles.r_72a4c7cd)}>
                    活跃
                  </span>
                }
              </div>
              <div className={cx(styles.r_1dc571a3, styles.r_7b89cd85, styles.r_117ec720, styles.r_09ace3a4)}>
                {t.category}
              </div>
              <div className={cx(styles.r_50d0d216, styles.r_da7c36cd)}>
                {t.windows.map((w, i) =>
                <div
                  key={i}
                  className={cx(styles.r_07389a77, styles.r_84591855, styles.r_d5eab218, styles.r_660d2eff, styles.r_0e65706b, styles.r_1dc571a3, styles.r_02eb621e)}>

                    {String(w.startMonth).padStart(2, '0')}.{String(w.startDay).padStart(2, '0')}
                    {' → '}
                    {String(w.endMonth).padStart(2, '0')}.{String(w.endDay).padStart(2, '0')}
                  </div>
                )}
              </div>
              <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_44ee8ba0, styles.r_4d2392e8)}>
                <span title="Logo badge">{t.decoration.logoBadge}</span>
                <span title="Avatar badge">{t.decoration.avatarBadge}</span>
                <span title="Particle">{t.decoration.particleEmoji}</span>
                <span className={cx(styles.r_fb56d9cf, styles.r_1dc571a3, styles.r_66a36c90)}>
                  particles={t.decoration.particleCount}
                </span>
              </div>
            </div>);

        })}
      </div>
    </div>);

}