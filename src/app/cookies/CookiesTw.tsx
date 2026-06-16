import styles from './CookiesTw.module.scss';
import { cx } from '@/lib/style-utils';

export function CookiesTw() {
  return (
    <>
      <h1>植友圈 Cookie 政策</h1>
      <p className={styles.r_eb16169c}>
        最近更新日期:2026 年 05 月 07 日 · 生效日期:發佈之日
      </p>

      <p>
        本政策說明「植友圈」(以下簡稱「本服務」)如何使用 Cookie 以及同類技術(例如
        localStorage、sessionStorage、pixel tag)。我們把 Cookie 分為四類,你可以在首次訪問時的
        同意框或設定頁中自主選擇啟用哪些類別,
        <strong>「必要類」因承載登入、安全等基礎功能無法關閉</strong>。
      </p>

      <h2>一、Cookie 的四個分類</h2>

      <h3>1.1 必要類 Cookie(Strictly Necessary)</h3>
      <p>
        這類 Cookie 是網站運行必備的,沒有它們核心功能(登入、身分驗證、支付結算等)將無法使用。
        我們不會基於這些 Cookie 進行跨站追蹤或廣告投放。
      </p>
      <ul>
        <li><code>rouyou_token</code>:登入狀態憑證(JWT),httpOnly、Secure、SameSite=Lax,有效期 30 天;</li>
        <li><code>rouyou_locale</code>:語言偏好,有效期 1 年;</li>
        <li><code>rouyou_csrf</code>(如啟用):跨站請求偽造防護;</li>
        <li><code>_next_*</code>:Next.js 框架內部所需的會話 Cookie。</li>
      </ul>

      <h3>1.2 功能類 Cookie(Preferences)</h3>
      <p>用於記住你的非必要偏好設定,例如節日主題開關、發文草稿、通知提醒等。</p>
      <ul>
        <li>節日主題關閉列表(存 localStorage);</li>
        <li>Cookie 同意記錄(存 localStorage);</li>
        <li>你的介面習慣(列表/卡片檢視、主題色等)。</li>
      </ul>

      <h3>1.3 分析類 Cookie(Analytics)</h3>
      <p>
        用於了解用戶如何與本服務互動(頁面瀏覽量、停留時長、按鈕點擊等),
        資料均經去識別化處理,僅用於產品改進,不會反向識別到你本人。
      </p>
      <ul>
        <li>效能監控(頁面載入耗時、API 回應時長);</li>
        <li>行為統計(匿名化的訪問路徑與功能使用率)。</li>
      </ul>

      <h3>1.4 廣告類 Cookie(Advertising)</h3>
      <p>
        用於向你展示更相關的推廣內容,或衡量推廣效果。目前本服務沒有投放第三方廣告,
        這一類別 <strong>保留位置,實際未使用</strong>;如果未來引入,我們會在本政策更新並徵詢你的同意。
      </p>

      <h2>二、同意與變更</h2>
      <p>首次訪問時,頁面底部會出現同意條,你可以選擇:</p>
      <ul>
        <li><strong>全部接受</strong>:同意四大類全部啟用;</li>
        <li><strong>僅必需</strong>:只允許必要類 Cookie,其他類別禁用;</li>
        <li><strong>自訂</strong>:逐項勾選你願意啟用的類別。</li>
      </ul>
      <p>
        你的選擇會透過 localStorage 記錄(鍵名 <code>rouyou.cookieConsent.v1</code>),
        有效期為 6 個月;到期後會再次向你詢問。你也可以隨時在「設定 → 外觀與語言」頁面重新修改。
      </p>

      <h2>三、第三方 Cookie</h2>
      <p>
        本服務目前不使用第三方 Cookie。若你在站內跳轉到外部連結(如 Wikimedia 圖片來源),
        該外部站點會受其自身的隱私與 Cookie 政策約束,與本政策無關。
      </p>

      <h2>四、如何禁用 Cookie</h2>
      <p>
        除了使用本站提供的同意框,你也可以在瀏覽器中單獨禁用或清除 Cookie。
        請注意禁用「必要類」Cookie 會導致你無法登入或使用交易功能。
      </p>

      <h2>五、聯絡我們</h2>
      <p>
        如你對我們的 Cookie 使用方式有疑問,請透過 <code>support@rouyou.example</code> 聯絡我們。
      </p>

      <hr />
      <p className={cx(styles.r_359090c2, styles.r_eb16169c)}>Demo 版本,不構成法律意見。</p>
    </>);

}