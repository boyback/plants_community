'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';

const DEFAULT_CATEGORIES = ['工具', '肥料', '盆器', '盆土', '植物', '礼物'];

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [descriptionJson, setDescriptionJson] = useState<unknown>(null);
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [priceYuan, setPriceYuan] = useState('');
  const [originalPriceYuan, setOriginalPriceYuan] = useState('');
  const [cover, setCover] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [shipFrom, setShipFrom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 拉服务端的真实分类
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  useEffect(() => {
    api
      .get<{ name: string; count: number }[]>('/api/market/categories')
      .then((list) => {
        const names = list.map((x) => x.name);
        const merged = Array.from(new Set([...names, ...DEFAULT_CATEGORIES]));
        if (merged.length > 0) {
          setCategories(merged);
          if (!names.includes(category)) setCategory(merged[0]);
        }
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
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
          <div className="text-4xl">🛒</div>
          <div className="mt-3 text-lg font-semibold">{t('market.sell.loginRequired')}</div>
          <Link href="/login?redirect=/market/sell" className="btn-primary mt-4 inline-flex">
            {t('nav.login')}
          </Link>
        </div>
      </Shell>
    );
  }

  const submit = async () => {
    setErr(null);
    if (!title.trim()) return setErr(t('market.sell.titleRequired'));
    if (!cover.trim()) return setErr(t('market.sell.coverRequired'));
    const price = Math.round(Number(priceYuan) * 100);
    if (!Number.isFinite(price) || price <= 0) return setErr(t('market.sell.priceInvalid'));
    const originalPrice = originalPriceYuan
      ? Math.round(Number(originalPriceYuan) * 100)
      : undefined;
    const images = imagesText
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const j = descriptionJson as { content?: unknown[] } | null;
    if (!j || !Array.isArray(j.content) || j.content.length === 0) {
      return setErr(t('market.sell.descRequired'));
    }

    setSubmitting(true);
    try {
      const r = await api.post<{ id: string }>('/api/market/products', {
        title,
        descriptionJson,
        category,
        price,
        originalPrice,
        cover,
        images: images.length ? images : [cover],
        tags,
        shipFrom: shipFrom || undefined,
      });
      setToast(t('market.sell.success'));
      setTimeout(() => router.push(`/market/${r.id}`), 1000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('market.sell.fail'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{t('market.sell.title')}</h1>
          <p className="text-sm text-leaf-700/70">{t('market.sell.subtitle')}</p>
        </div>

        <PermissionGate perm="market:sell">
          <div className="card p-6 space-y-4">
            <Field label={t('market.sell.fieldTitle')}>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('market.sell.fieldTitlePlaceholder')}
                maxLength={80}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t('market.sell.fieldCategory')}>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('market.sell.fieldShipFrom')}>
                <input
                  className="input"
                  value={shipFrom}
                  onChange={(e) => setShipFrom(e.target.value)}
                  placeholder={t('market.sell.fieldShipFromPlaceholder')}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t('market.sell.fieldPrice')}>
                <input
                  className="input"
                  value={priceYuan}
                  onChange={(e) => setPriceYuan(e.target.value)}
                  placeholder={t('market.sell.fieldPricePlaceholder')}
                  inputMode="decimal"
                />
              </Field>
              <Field label={t('market.sell.fieldOriginalPrice')}>
                <input
                  className="input"
                  value={originalPriceYuan}
                  onChange={(e) => setOriginalPriceYuan(e.target.value)}
                  placeholder={t('market.sell.fieldOriginalPricePlaceholder')}
                  inputMode="decimal"
                />
              </Field>
            </div>

            <Field label={t('market.sell.fieldCover')}>
              <input
                className="input"
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                placeholder="https://..."
              />
            </Field>

            <Field label={t('market.sell.fieldImages')}>
              <textarea
                className="input min-h-[80px]"
                value={imagesText}
                onChange={(e) => setImagesText(e.target.value)}
                placeholder="https://...\nhttps://..."
              />
            </Field>

            <Field label={t('market.sell.fieldDescription')}>
              <RichTextEditor
                value={descriptionJson}
                onChange={setDescriptionJson}
                placeholder={t('market.sell.fieldDescriptionPlaceholder')}
                minHeight={180}
                charLimit={5000}
              />
            </Field>

            <Field label={t('market.sell.fieldTags')}>
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
                  placeholder={tags.length >= 6 ? t('market.sell.fieldTagsPlaceholder') : t('market.sell.fieldTagsPlaceholderEmpty')}
                  disabled={tags.length >= 6}
                />
              </div>
            </Field>

            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}

            <div className="flex justify-end gap-2 border-t border-leaf-100 pt-4">
              <Link href="/market" className="btn-outline">
                {t('common.cancel')}
              </Link>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-primary"
              >
                <Icon name="check" size={14} />
                {submitting ? t('market.sell.submitting') : t('market.sell.submit')}
              </button>
            </div>
          </div>
        </PermissionGate>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
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
