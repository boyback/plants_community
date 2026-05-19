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
import { api, ApiError } from '@/lib/client-api';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { formatPrice } from '@/lib/utils';

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
    api
      .get<{ name: string; count: number }[]>('/api/market/boards')
      .then((list) => {
        const names = list.map((x) => x.name);
        const merged = Array.from(new Set([...names, ...DEFAULT_CATEGORIES]));
        setCategories(merged);
      })
      .catch(() => null);
  }, []);

  if (authLoading) {
    return (
      <Shell>
        <div className="py-10 text-center text-sm text-leaf-700/60">{t('common.loading')}</div>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">🔨</div>
          <div className="mt-3 text-lg font-semibold">{t('auction.create.loginRequired')}</div>
          <Link href="/login?redirect=/auction/new" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr(t('auction.create.titleRequired'));
    if (!cover.trim()) return setErr(t('auction.create.coverRequired'));
    const j = descriptionJson as { content?: unknown[] } | null;
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
      const r = await api.post<{ id: string }>('/api/auctions', {
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
        antiSnipeMinutes,
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
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{t('auction.create.pageTitle')}</h1>
          <p className="text-sm text-leaf-700/70">
            {t('auction.create.pageSubtitle')}
          </p>
        </div>

        <PermissionGate perm="market:sell">
          <div className="card space-y-4 p-6">
            {/* 基础信息 */}
            <Section title="🪧">
              <Field label={t('auction.create.fieldTitle')}>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('auction.create.fieldTitlePlaceholder')}
                  maxLength={80}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('auction.create.fieldCategory')}>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {boards.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('auction.create.fieldCover')}>
                  <input
                    className="input"
                    value={cover}
                    onChange={(e) => setCover(e.target.value)}
                    placeholder="https://..."
                  />
                </Field>
              </div>
              <Field label={t('auction.create.fieldImages')}>
                <textarea
                  className="input min-h-[60px]"
                  value={imagesText}
                  onChange={(e) => setImagesText(e.target.value)}
                />
              </Field>
              <Field label={t('auction.create.fieldDescription')}>
                <RichTextEditor
                  value={descriptionJson}
                  onChange={setDescriptionJson}
                  placeholder={t('auction.create.fieldDescription')}
                  minHeight={180}
                  charLimit={5000}
                />
              </Field>
              <Field label={t('auction.create.fieldTags')}>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-leaf-200 bg-white p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((x) => x !== tag))}
                        className="text-leaf-600 hover:text-leaf-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 bg-transparent px-1 text-sm outline-none min-w-[120px]"
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
                    disabled={tags.length >= 6}
                  />
                </div>
              </Field>
            </Section>

            {/* 价格设置 */}
            <Section title="💰">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('auction.create.fieldStartPrice')}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={startPriceYuan}
                    onChange={(e) => setStartPriceYuan(e.target.value)}
                  />
                </Field>
                <Field label={t('auction.create.fieldMinIncrement')}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={minIncrementYuan}
                    onChange={(e) => setMinIncrementYuan(e.target.value)}
                  />
                </Field>
                <Field label={t('auction.create.fieldBuyNow')}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={buyNowYuan}
                    onChange={(e) => setBuyNowYuan(e.target.value)}
                    placeholder="200"
                  />
                </Field>
                <Field label={t('auction.create.fieldReserve')}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={reserveYuan}
                    onChange={(e) => setReserveYuan(e.target.value)}
                    placeholder={t('auction.reserveHint')}
                  />
                </Field>
                <Field label={t('auction.create.fieldDeposit')}>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={depositYuan}
                    onChange={(e) => setDepositYuan(e.target.value)}
                  />
                </Field>
              </div>
            </Section>

            {/* 时间 */}
            <Section title="⏰">
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('auction.create.fieldStartAt')}>
                  <input
                    type="datetime-local"
                    className="input"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </Field>
                <Field label={t('auction.create.fieldEndAt')}>
                  <input
                    type="datetime-local"
                    className="input"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </Field>
                <Field label={t('auction.create.fieldAntiSnipe')}>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={30}
                    value={antiSnipeMinutes}
                    onChange={(e) => setAntiSnipeMinutes(Number(e.target.value) || 0)}
                  />
                  <div className="mt-1 text-[11px] text-leaf-700/60">
                    {t('auction.antiSnipe', { n: antiSnipeMinutes })}
                  </div>
                </Field>
              </div>
            </Section>

            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}

            <div className="flex justify-end gap-2 border-t border-leaf-100 pt-4">
              <Link href="/auction" className="btn-outline">{t('common.cancel')}</Link>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-primary"
              >
                <Icon name="check" size={14} />
                {submitting ? t('auction.create.submitting') : t('auction.create.submit')}
              </button>
            </div>
          </div>
        </PermissionGate>

        <div className="mt-6 rounded-xl bg-leaf-50/60 p-4 text-[11px] text-leaf-700/70">
          <div className="mb-1 font-medium text-leaf-700">📜 发布须知</div>
          <ul className="ml-4 list-disc space-y-0.5">
            <li>拍卖结束后,胜出者保证金自动抵扣到尾款,其余人退还等值积分</li>
            <li>已有出价的拍卖无法取消</li>
            <li>胜出者 24 小时内未付款,保证金没收</li>
            <li>请遵守平台规则,商品需符合社区交易公约</li>
          </ul>
        </div>
      </div>
    </Shell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink-800">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-leaf-700/80">{label}</label>
      {children}
    </div>
  );
}
