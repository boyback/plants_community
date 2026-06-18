import styles from './PrivacyEn.module.scss';
import { cx } from '@/lib/style-utils';

export function PrivacyEn() {
  return (
    <>
      <h1>ZhiYou Privacy Policy</h1>
      <p className={styles.r_eb16169c}>Last updated: 7 May 2026 · Effective on the date of publication</p>

      <p>
        ZhiYou (&quot;we&quot;, &quot;us&quot;) values your privacy. This Policy explains what
        personal data we collect, how we use and protect it, and the rights you have as a
        data subject. It reflects the requirements of the EU General Data Protection
        Regulation (GDPR), the UK GDPR, and the PRC Personal Information Protection Law
        (PIPL).
      </p>

      <h2>1. What personal data we collect</h2>
      <ol>
        <li>
          <strong>Account data</strong> — username, hashed password, avatar, bio, language
          preference.
        </li>
        <li>
          <strong>User content</strong> — posts, comments, likes, saves, follows, direct
          messages, help-request bounties.
        </li>
        <li>
          <strong>Transaction data</strong> — orders, shipping addresses, diamond ledger,
          auction bids and deposits, VIP subscriptions. Shipping addresses are considered
          sensitive and are shared only with the relevant seller for fulfillment.
        </li>
        <li>
          <strong>Device &amp; logs</strong> — IP address, User-Agent, operating system,
          access timestamps and paths — used solely for security audit and debugging.
        </li>
        <li>
          <strong>Cookies &amp; similar</strong> — see our <a href="/cookies">Cookie Policy</a>.
        </li>
      </ol>

      <h2>2. How we use your data</h2>
      <ul>
        <li>to provide core features — registration, login, posting, trading, auctions;</li>
        <li>to personalise what you see (e.g. ranking by the boards you follow);</li>
        <li>to send operational notifications (order status, auction outcome, mentions);</li>
        <li>to detect abuse, fraud and unauthorised access;</li>
        <li>to produce aggregated, anonymised analytics;</li>
        <li>to comply with legal obligations (ID checks, reporting).</li>
      </ul>

      <h2>3. Legal basis for processing</h2>
      <ul>
        <li><strong>Contract</strong> — to deliver the services you signed up for;</li>
        <li><strong>Consent</strong> — for personalised recommendations and marketing (withdrawable at any time);</li>
        <li><strong>Legal obligation</strong> — compliance with identity verification, AML, cybersecurity regulations;</li>
        <li><strong>Legitimate interests</strong> — fraud prevention and security, balanced against your rights.</li>
      </ul>

      <h2>4. Your rights</h2>
      <p>
        Under GDPR and PIPL, you have the following rights. Submit a request via{' '}
        <code>support@rouyou.example</code> or via in-app messaging to the official account.
      </p>
      <ul>
        <li><strong>Right of access</strong> — know what data we hold;</li>
        <li><strong>Right to rectification</strong> — correct inaccurate data;</li>
        <li><strong>Right to erasure</strong> (right to be forgotten);</li>
        <li><strong>Right to withdraw consent</strong>;</li>
        <li><strong>Right to data portability</strong> — machine-readable export;</li>
        <li><strong>Right to restrict / object to automated decision-making</strong>;</li>
        <li><strong>Right to lodge a complaint</strong> with a supervisory authority (e.g. CAC in China, your national DPA in the EU).</li>
      </ul>

      <h2>5. Account deletion</h2>
      <p>
        You may delete your account from the Settings page at any time. We will anonymise
        or delete your data within 30 days unless legal retention periods apply (e.g. tax
        and commercial records retained for at least 3 years under PRC law).
      </p>

      <h2>6. Children</h2>
      <p>
        The Service is <strong>not directed at children under 14</strong>. If we detect a
        child account, it will be disabled and the data anonymised. Guardians of minors
        (14–18) may contact us to manage the account.
      </p>

      <h2>7. International transfers</h2>
      <p>
        If you are outside mainland China, your data may be transferred to and processed in
        mainland China. We rely on recognised transfer mechanisms (standard contractual
        clauses, security assessments, explicit consent) to ensure a lawful basis for such
        transfers.
      </p>

      <h2>8. Security &amp; retention</h2>
      <ul>
        <li>passwords are hashed with bcrypt; all traffic uses HTTPS;</li>
        <li>internal access is least-privilege and audited;</li>
        <li>retention is limited to what is necessary for the purpose;</li>
        <li>in the event of a personal-data breach, we will notify the relevant authority within 72 hours and affected users without undue delay.</li>
      </ul>

      <h2>9. Third-party sharing</h2>
      <p>We do not sell your personal data. We share it only:</p>
      <ul>
        <li>at your instruction (e.g. forwarding your shipping address to a seller);</li>
        <li>where required by law, regulation or a court order;</li>
        <li>with service providers under written contractual confidentiality (cloud, SMS).</li>
      </ul>

      <h2>10. Changes &amp; contact</h2>
      <p>
        We may revise this Policy; material changes will be announced in-app. If you have
        any questions or wish to exercise your rights, please contact{' '}
        <code>support@rouyou.example</code>.
      </p>

      <hr />
      <p className={cx(styles.r_359090c2, styles.r_eb16169c)}>
        This is a demo-quality draft. Please have a qualified compliance/legal
        professional review before production use.
      </p>
    </>);

}
