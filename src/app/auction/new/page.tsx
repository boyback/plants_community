'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from "@/lib/client-api";
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { formatPrice } from '@/lib/utils';
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



const DEFAULT_CATEGORIES = ['工具', '肥料', '盆器', '盆土', '植物', '礼物'];

function inOneHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return toLocalInput(d);
}
function in3Days() {
  const d = new Date(Date.now() + 3 * 86400_000);
  return toLocalInput(d);
}
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewAuctionPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [descriptionJson, setDescriptionJson] = useState<unknown>(null);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [cover, setCover] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [startPriceYuan, setStartPriceYuan] = useState('1');
  const [minIncrementYuan, setMinIncrementYuan] = useState('1');
  const [buyNowYuan, setBuyNowYuan] = useState('');
  const [reserveYuan, setReserveYuan] = useState('');
  const [depositYuan, setDepositYuan] = useState('20');

  const [startAt, setStartAt] = useState(inOneHour());
  const [endAt, setEndAt] = useState(in3Days());
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState(5);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [boards, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  useEffect(() => {
    api.
    get<{name: string;count: number;}[]>('/api/market/boards').
    then((list) => {
      const names = list.map((x) => x.name);
      const merged = Array.from(new Set([...names, ...DEFAULT_CATEGORIES]));
      setCategories(merged);
    }).
    catch(() => null);
  }, []);

  if (authLoading) {
    return (
      <Shell>
        <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>{t('common.loading')}</div>
      </Shell>);

  }

  if (!user) {
    return (
      <Shell>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={styles.r_a95699d9}>🔨</div>
          <div className={cx(styles.r_eccd13ef, styles.r_42536e69, styles.r_e83a7042)}>{t('auction.create.loginRequired')}</div>
          <Link href="/login?redirect=/auction/new" className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
            {t('nav.login')}
          </Link>
        </div>
      </Shell>);

  }

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr(t('auction.create.titleRequired'));
    if (!cover.trim()) return setErr(t('auction.create.coverRequired'));
    const j = descriptionJson as {content?: unknown[];} | null;
    if (!j || !Array.isArray(j.content) || j.content.length === 0) {
      return setErr(t('auction.create.descriptionRequired'));
    }

    const startPrice = Math.round(Number(startPriceYuan) * 100);
    if (!Number.isFinite(startPrice) || startPrice < 100) return setErr(t('editor.errors.needPermission'));

    const minIncrement = Math.round(Number(minIncrementYuan) * 100);
    if (!Number.isFinite(minIncrement) || minIncrement < 100) return setErr(t('editor.errors.needPermission'));

    const buyNowPrice = buyNowYuan ? Math.round(Number(buyNowYuan) * 100) : undefined;
    if (buyNowPrice !== undefined && buyNowPrice <= startPrice) return setErr(t('auction.create.buyNowMustAboveStart'));

    const reservePrice = reserveYuan ? Math.round(Number(reserveYuan) * 100) : undefined;
    if (reservePrice !== undefined && reservePrice < startPrice) return setErr(t('auction.create.reserveMustAboveStart'));

    const depositAmount = Math.round(Number(depositYuan) * 100);
    if (!Number.isFinite(depositAmount) || depositAmount < 100) return setErr(t('auction.create.depositRequired'));

    const startAtISO = new Date(startAt).toISOString();
    const endAtISO = new Date(endAt).toISOString();
    if (new Date(endAtISO).getTime() - new Date(startAtISO).getTime() < 5 * 60 * 1000) {
      return setErr(t('auction.create.durationMinAlert'));
    }

    const images = imagesText.split(/\s+/).map((s) => s.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      const r = await api.post<{id: string;}>('/api/auctions', {
        title,
        descriptionJson,
        category,
        cover,
        images: images.length ? images : [cover],
        tags,
        startPrice,
        minIncrement,
        buyNowPrice,
        reservePrice,
        depositAmount,
        startAt: startAtISO,
        endAt: endAtISO,
        antiSnipeMinutes
      });
      toast.success(t('auction.create.success'));
      setTimeout(() => router.push(`/auction/${r.id}`), 800);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('auction.create.submitFail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className={cx(styles.r_0e12dc7d, styles.r_fa3f7111)}>
        <div className={styles.r_da019856}>
          <h1 className={cx(styles.r_3febee09, styles.r_69450ef1)}>{t('auction.create.pageTitle')}</h1>
          <p className={cx(styles.r_fc7473ca, styles.r_69335b95)}>
            {t('auction.create.pageSubtitle')}
          </p>
        </div>

        <PermissionGate perm="market:sell">
          <div className={cx(styles.r_3e7ce58d, styles.r_0478c89a)}>
            {/* 基础信息 */}
            <Section title="🪧">
              <Field label={t('auction.create.fieldTitle')}>
                <Input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('auction.create.fieldTitlePlaceholder')}
                  maxLength={80} />

              </Field>
              <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
                <Field label={t('auction.create.fieldCategory')}>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}>

                    {boards.map((c) =>
                    <option key={c} value={c}>{c}</option>
                    )}
                  </select>
                </Field>
                <Field label={t('auction.create.fieldCover')}>
                  <Input
                    className="input"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    placeholder="https://..." />

                </Field>
              </div>
              <Field label={t('auction.create.fieldImages')}>
                <Textarea
                  className={styles.r_a4197e87}
                  value={imagesText}
                  onChange={(e) => setImagesText(e.target.value)} />

              </Field>
              <Field label={t('auction.create.fieldDescription')}>
                <RichTextEditor
                  value={descriptionJson}
                  onChange={setDescriptionJson}
                  placeholder={t('auction.create.fieldDescription')}
                  minHeight={180}
                  charLimit={5000} />

              </Field>
              <Field label={t('auction.create.fieldTags')}>
                <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_7660b450)}>
                  {tags.map((tag) =>
                  <span
                    key={tag}
                    className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_5f6a59f1)}>

                      #{tag}
                      <button
                      type="button"
                      onClick={() => setTags(tags.filter((x) => x !== tag))}
                      className={cx(styles.r_b17d6a13, styles.r_81be6435)}>

                        ×
                      </button>
                    </span>
                  )}
                  <Input
                    className={cx(styles.r_36e579c0, styles.r_7f19cdf4, styles.r_d8e0e382, styles.r_fc7473ca, styles.r_df37b1fd, styles.r_a9ef791a)}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const v = tagInput.trim().replace(/^#/, '');
                        if (v && !tags.includes(v) && tags.length < 6) {
                          setTags([...tags, v]);
                        }
                        setTagInput('');
                      }
                    }}
                    placeholder={t('auction.create.fieldTagsPlaceholder')}
                    disabled={tags.length >= 6} />

                </div>
              </Field>
            </Section>

            {/* 价格设置 */}
            <Section title="💰">
              <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
                <Field label={t('auction.create.fieldStartPrice')}>
                  <Input
                    className="input"
                    inputMode="decimal"
                    value={startPriceYuan}
                    onChange={(e) => setStartPriceYuan(e.target.value)} />

                </Field>
                <Field label={t('auction.create.fieldMinIncrement')}>
                  <Input
                    className="input"
                    inputMode="decimal"
                    value={minIncrementYuan}
                    onChange={(e) => setMinIncrementYuan(e.target.value)} />

                </Field>
                <Field label={t('auction.create.fieldBuyNow')}>
                  <Input
                    className="input"
                    inputMode="decimal"
                    value={buyNowYuan}
                    onChange={(e) => setBuyNowYuan(e.target.value)}
                    placeholder="200" />

                </Field>
                <Field label={t('auction.create.fieldReserve')}>
                  <Input
                    className="input"
                    inputMode="decimal"
                    value={reserveYuan}
                    onChange={(e) => setReserveYuan(e.target.value)}
                    placeholder={t('auction.reserveHint')} />

                </Field>
                <Field label={t('auction.create.fieldDeposit')}>
                  <Input
                    className="input"
                    inputMode="decimal"
                    value={depositYuan}
                    onChange={(e) => setDepositYuan(e.target.value)} />

                </Field>
              </div>
            </Section>

            {/* 时间 */}
            <Section title="⏰">
              <div className={cx(styles.r_f3c543ad, styles.r_8e75e3db, styles.r_1004c0c3)}>
                <Field label={t('auction.create.fieldStartAt')}>
                  <Input
                    type="datetime-local"
                    className="input"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)} />

                </Field>
                <Field label={t('auction.create.fieldEndAt')}>
                  <Input
                    type="datetime-local"
                    className="input"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)} />

                </Field>
                <Field label={t('auction.create.fieldAntiSnipe')}>
                  <Input
                    type="number"
                    className="input"
                    min={0}
                    max={30}
                    value={antiSnipeMinutes}
                    onChange={(e) => setAntiSnipeMinutes(Number(e.target.value) || 0)} />

                  <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                    {t('auction.antiSnipe', { n: antiSnipeMinutes })}
                  </div>
                </Field>
              </div>
            </Section>

            {err &&
            <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_b54428d1)}>{err}</div>
            }

            <div className={cx(styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e, styles.r_b950dda2, styles.r_88b684d2, styles.r_173fa8f0)}>
              <Link href="/auction" className="btn-outline">{t('common.cancel')}</Link>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-primary">

                <Icon name="check" size={14} />
                {submitting ? t('auction.create.submitting') : t('auction.create.submit')}
              </button>
            </div>
          </div>
        </PermissionGate>

        <div className={cx(styles.r_31f25533, styles.r_a217b4ea, styles.r_a8a62ca4, styles.r_8e63407b, styles.r_d058ca6d, styles.r_69335b95)}>
          <div className={cx(styles.r_65281709, styles.r_2689f395, styles.r_5f6a59f1)}>📜 发布须知</div>
          <ul className={cx(styles.r_f242aff2, styles.r_1f33b438, styles.r_e2eedc57)}>
            <li>拍卖结束后,胜出者保证金自动抵扣到尾款,其余人退还等值积分</li>
            <li>已有出价的拍卖无法取消</li>
            <li>胜出者 24 小时内未付款,保证金没收</li>
            <li>请遵守平台规则,商品需符合社区交易公约</li>
          </ul>
        </div>
      </div>
    </Shell>);

}

function Section({ title, children }: {title: string;children: React.ReactNode;}) {
  return (
    <section>
      <h3 className={cx(styles.r_a77ed4d9, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{title}</h3>
      <div className={styles.r_6ed543e2}>{children}</div>
    </section>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div>
      <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_359090c2, styles.r_2689f395, styles.r_21d33c50)}>{label}</label>
      {children}
    </div>);

}
