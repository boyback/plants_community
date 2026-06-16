import styles from './CookiesEn.module.scss';
import { cx } from '@/lib/style-utils';

export function CookiesEn() {
  return (
    <>
      <h1>ZhiYou Cookie Policy</h1>
      <p className={styles.r_eb16169c}>Last updated: 7 May 2026 · Effective on the date of publication</p>

      <p>
        This policy explains how ZhiYou (the &quot;Service&quot;) uses cookies and
        similar technologies (localStorage, sessionStorage, pixel tags). We group
        cookies into four boards. You choose which ones to enable in the
        first-visit banner or in Settings — except the
        <strong> Strictly Necessary </strong>
        category, which is required for basic functionality (sign-in, security)
        and cannot be turned off.
      </p>

      <h2>1. Cookie boards</h2>

      <h3>1.1 Strictly Necessary</h3>
      <p>
        Needed for core features to work. We do not use these for cross-site
        tracking or advertising.
      </p>
      <ul>
        <li><code>rouyou_token</code> — JWT for your signed-in session (httpOnly, Secure, SameSite=Lax, 30-day max age);</li>
        <li><code>rouyou_locale</code> — language preference (1-year max age);</li>
        <li><code>rouyou_csrf</code> (when enabled) — CSRF protection token;</li>
        <li><code>_next_*</code> — session cookies required by the Next.js framework.</li>
      </ul>

      <h3>1.2 Preferences</h3>
      <p>To remember your non-essential settings.</p>
      <ul>
        <li>Festival theme disable list (localStorage);</li>
        <li>Cookie-consent record (localStorage);</li>
        <li>UI preferences (list/card view, accent colour).</li>
      </ul>

      <h3>1.3 Analytics</h3>
      <p>
        To understand how users interact with the Service (page views, dwell time,
        click-through). Data is aggregated and anonymised, used only to improve
        the product, and never linked back to you personally.
      </p>

      <h3>1.4 Advertising</h3>
      <p>
        For targeted advertising and campaign measurement. We currently do{' '}
        <strong>not run any third-party ads</strong>; this category is a
        placeholder. If this changes, we will update this Policy and request
        your consent beforehand.
      </p>

      <h2>2. Consent &amp; changes</h2>
      <p>
        On your first visit, a banner at the bottom offers three options:
      </p>
      <ul>
        <li><strong>Accept all</strong> — enable all four boards;</li>
        <li><strong>Only necessary</strong> — enable only the required category;</li>
        <li><strong>Customise</strong> — opt in/out of each category individually.</li>
      </ul>
      <p>
        Your choice is stored in localStorage (key{' '}
        <code>rouyou.cookieConsent.v1</code>) for 6 months; after that we will
        ask again. You can change your mind at any time under{' '}
        <em>Settings → Appearance &amp; Language</em>.
      </p>

      <h2>3. Third-party cookies</h2>
      <p>
        The Service does not use third-party cookies at this time. When you
        follow an external link (e.g. to Wikimedia image sources), that site is
        governed by its own privacy and cookie policies.
      </p>

      <h2>4. Opting out</h2>
      <p>
        In addition to the banner, you can block or clear cookies in your
        browser. Note that disabling Strictly Necessary cookies will prevent you
        from signing in or completing transactions.
      </p>

      <h2>5. Contact</h2>
      <p>
        Questions? Please reach us at <code>support@rouyou.example</code>.
      </p>

      <hr />
      <p className={cx(styles.r_359090c2, styles.r_eb16169c)}>Demo draft; not legal advice.</p>
    </>);

}