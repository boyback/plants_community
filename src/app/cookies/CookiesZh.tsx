export function CookiesZh() {
  return (
    <>
      <h1>肉友社 Cookie 政策</h1>
      <p className="text-leaf-500">
        最近更新日期:2026 年 05 月 07 日 · 生效日期:发布之日
      </p>

      <p>
        本政策说明「肉友社」(以下简称「本服务」)如何使用 Cookie 以及同类技术(例如
        localStorage、sessionStorage、pixel tag)。我们把 Cookie 分为四类,你可以在首次访问时的
        同意框或设置页中自主选择启用哪些类别,
        <strong>「必要类」因承载登录、安全等基础功能无法关闭</strong>。
      </p>

      <h2>一、Cookie 的四个分类</h2>

      <h3>1.1 必要类 Cookie(Strictly Necessary)</h3>
      <p>
        这类 Cookie 是网站运行必备的,没有它们核心功能(登录、身份验证、支付结算等)将无法使用。
        我们不会基于这些 Cookie 进行跨站追踪或广告投放。
      </p>
      <ul>
        <li><code>rouyou_token</code>:登录态凭证(JWT),httpOnly、Secure、SameSite=Lax,有效期 30 天;</li>
        <li><code>rouyou_locale</code>:语言偏好,有效期 1 年;</li>
        <li><code>rouyou_csrf</code>(如启用):跨站请求伪造防护;</li>
        <li><code>_next_*</code>:Next.js 框架内部所需的会话 Cookie。</li>
      </ul>

      <h3>1.2 功能类 Cookie(Preferences)</h3>
      <p>用于记住你的非必要偏好设置,例如节日主题开关、发帖草稿、通知提醒等。</p>
      <ul>
        <li>节日主题关闭列表(存 localStorage);</li>
        <li>Cookie 同意记录(存 localStorage);</li>
        <li>你的界面习惯(列表/卡片视图、主题色等)。</li>
      </ul>

      <h3>1.3 分析类 Cookie(Analytics)</h3>
      <p>
        用于了解用户如何与本服务互动(页面访问量、停留时长、按钮点击等),
        数据均经去标识化处理,仅用于产品改进,不会反向识别到你本人。
      </p>
      <ul>
        <li>性能监控(页面加载耗时、API 响应时长);</li>
        <li>行为统计(匿名化的访问路径与功能使用率)。</li>
      </ul>

      <h3>1.4 广告类 Cookie(Advertising)</h3>
      <p>
        用于向你展示更相关的推广内容,或衡量推广效果。目前本服务没有投放第三方广告,
        这一类别 <strong>保留占位,实际未使用</strong>;如果未来引入,我们会在本政策更新并征询你的同意。
      </p>

      <h2>二、同意与变更</h2>
      <p>
        首次访问时,页面底部会出现同意条,你可以选择:
      </p>
      <ul>
        <li><strong>全部接受</strong>:同意四大类全部启用;</li>
        <li><strong>仅必需</strong>:只允许必要类 Cookie,其他类别禁用;</li>
        <li><strong>自定义</strong>:逐项勾选你愿意启用的类别。</li>
      </ul>
      <p>
        你的选择会通过 localStorage 记录(键名 <code>rouyou.cookieConsent.v1</code>),
        有效期为 6 个月;到期后会再次向你询问。你也可以随时在「设置 → 外观与语言」页面重新修改。
      </p>

      <h2>三、第三方 Cookie</h2>
      <p>
        本服务目前不使用第三方 Cookie。若你在站内跳转到外部链接(如 Wikimedia 图片源),
        该外部站点会受其自身的隐私与 Cookie 政策约束,与本政策无关。
      </p>

      <h2>四、如何禁用 Cookie</h2>
      <p>
        除了使用本站提供的同意框,你也可以在浏览器中单独禁用或清除 Cookie。
        请注意禁用「必要类」Cookie 会导致你无法登录或使用交易功能。
      </p>

      <h2>五、联系我们</h2>
      <p>
        如你对我们的 Cookie 使用方式有疑问,请通过 <code>support@rouyou.example</code> 联系我们。
      </p>

      <hr />
      <p className="text-xs text-leaf-500">Demo 版本,不构成法律意见。</p>
    </>
  );
}
