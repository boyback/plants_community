import styles from './CookiesJa.module.scss';
import { cx } from '@/lib/style-utils';

export function CookiesJa() {
  return (
    <>
      <h1>ZhiYou Cookie ポリシー</h1>
      <p className={styles.r_eb16169c}>最終更新日:2026 年 5 月 7 日 · 発効日:公開日</p>

      <p>
        本ポリシーは、ZhiYou(以下「本サービス」)が Cookie および類似技術(localStorage、sessionStorage、ピクセルタグ等)をどのように使用するかを説明します。
        Cookie は 4 つのカテゴリに分類されており、初回訪問時の同意バナー、または設定ページから個別に有効化を選択できます。
        <strong>「必須」はログインやセキュリティといった基本機能を担うためオフにできません</strong>。
      </p>

      <h2>1. Cookie の 4 カテゴリ</h2>

      <h3>1.1 必須 Cookie(Strictly Necessary)</h3>
      <p>
        サービスの運用に不可欠です。ログイン、認証、決済などの中核機能はこれがなければ動作しません。
        これらの Cookie を跨サイトトラッキングや広告配信に使用することはありません。
      </p>
      <ul>
        <li><code>rouyou_token</code>:ログインセッション用 JWT。httpOnly、Secure、SameSite=Lax、有効期限 30 日;</li>
        <li><code>rouyou_locale</code>:言語設定、有効期限 1 年;</li>
        <li><code>rouyou_csrf</code>(有効化時):CSRF 対策;</li>
        <li><code>_next_*</code>:Next.js フレームワーク内部が必要とするセッション Cookie。</li>
      </ul>

      <h3>1.2 機能 Cookie(Preferences)</h3>
      <p>季節テーマの有効/無効、投稿下書き、通知設定など、必須ではない設定を保持するために使用します。</p>
      <ul>
        <li>季節テーマ無効化リスト(localStorage);</li>
        <li>Cookie 同意記録(localStorage);</li>
        <li>UI 設定(リスト/カード表示、アクセントカラー等)。</li>
      </ul>

      <h3>1.3 分析 Cookie(Analytics)</h3>
      <p>
        ページビュー、滞在時間、クリックなど、利用者の行動を把握するために使用します。
        データは匿名化・集計され、製品改善のみに利用し、個人を再識別することはありません。
      </p>
      <ul>
        <li>パフォーマンス監視(ページ読み込み時間、API 応答時間);</li>
        <li>行動統計(匿名化されたアクセス経路と機能利用率)。</li>
      </ul>

      <h3>1.4 広告 Cookie(Advertising)</h3>
      <p>
        関連性の高い広告を表示するため、または広告効果を測定するために使用します。現在本サービスは第三者広告を配信していないため、
        このカテゴリは <strong>プレースホルダーであり実際には使用していません</strong>。将来導入する場合は本ポリシーを更新し、改めて同意を取得します。
      </p>

      <h2>2. 同意と変更</h2>
      <p>初回訪問時、画面下部に同意バナーを表示します。以下から選択できます:</p>
      <ul>
        <li><strong>すべて受け入れる</strong>:4 カテゴリをすべて有効化;</li>
        <li><strong>必須のみ</strong>:必須 Cookie のみ有効化、それ以外は無効化;</li>
        <li><strong>カスタマイズ</strong>:カテゴリごとに個別に選択。</li>
      </ul>
      <p>
        選択内容は localStorage(キー <code>rouyou.cookieConsent.v1</code>)に 6 ヶ月間記録され、期限到来後に改めて確認します。
        「設定 → 外観と言語」からいつでも変更可能です。
      </p>

      <h2>3. 第三者 Cookie</h2>
      <p>
        現時点で第三者 Cookie は使用していません。外部サイト(Wikimedia の画像ソースなど)へのリンクを開いた場合、
        その遷移先は当該サイトのプライバシー・Cookie ポリシーの適用を受けます。
      </p>

      <h2>4. Cookie の無効化方法</h2>
      <p>
        本サイトの同意バナーに加え、お使いのブラウザから Cookie を個別にブロック・削除することもできます。
        「必須」Cookie を無効化するとログインや取引ができなくなる点にご注意ください。
      </p>

      <h2>5. お問い合わせ</h2>
      <p>Cookie の利用方法についてご質問がある場合は <code>support@rouyou.example</code> までご連絡ください。</p>

      <hr />
      <p className={cx(styles.r_359090c2, styles.r_eb16169c)}>Demo 版であり、法的助言を構成するものではありません。</p>
    </>);

}