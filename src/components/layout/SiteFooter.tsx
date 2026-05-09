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

const SUPPORT_EMAIL = 'support@plantcommunity.cn';

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-leaf-100/60 bg-leaf-50/40">
      <div className="mx-auto max-w-[1280px] px-4 py-8 lg:px-6">
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {/* 1. 关于 */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-800">🌿 肉友社</div>
            <p className="text-xs leading-5 text-ink-700/70">
              一个让多肉爱好者交流养护、分享美图、记录成长的中文社区。
              欢迎新手入坑,也欢迎老玩家来切磋。
            </p>
          </div>

          {/* 2. 法律 */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-800">法律与合规</div>
            <ul className="space-y-1.5 text-xs text-ink-700/70">
              <li>
                <Link href="/terms" className="hover:text-leaf-700 hover:underline">
                  用户协议
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-leaf-700 hover:underline">
                  隐私政策
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-leaf-700 hover:underline">
                  Cookie 政策
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=违法和不良信息举报`}
                  className="hover:text-leaf-700 hover:underline"
                >
                  违法和不良信息举报
                </a>
              </li>
            </ul>
          </div>

          {/* 3. 联系 */}
          <div>
            <div className="mb-2 text-sm font-semibold text-ink-800">联系我们</div>
            <ul className="space-y-1.5 text-xs text-ink-700/70">
              <li>
                联系邮箱:{' '}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-leaf-700 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 底部分隔线 + 版权 */}
        <div className="mt-6 border-t border-leaf-100/60 pt-4 text-center text-[11px] text-ink-700/50">
          © {new Date().getFullYear()} 肉友社 · 仅供学习与交流 · 不构成任何专业养护或商业建议
        </div>
      </div>
    </footer>
  );
}
