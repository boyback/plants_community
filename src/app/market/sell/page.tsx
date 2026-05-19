'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { Icon } from '@/components/ui/Icon';
import { UploadField } from '@/components/upload/UploadField';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { api, ApiError } from '@/lib/client-api';
import { toast } from '@/components/ui/Toast';
import type { Board } from '@/lib/types';

interface ProductItem {
  id: string;
  title: string;
  priceYuan: string;
  images: string[];
  description: string;
}

function emptyProduct(): ProductItem {
  return { id: crypto.randomUUID(), title: '', priceYuan: '', images: [], description: '' };
}

export default function SellPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useI18n();

  // 商品列表（支持多个）
  const [products, setProducts] = useState<ProductItem[]>([emptyProduct()]);

  // 共享字段
  const [categorySlug, setCategorySlug] = useState('');
  const [genusSlug, setGenusSlug] = useState('');
  const [speciesSlug, setSpeciesSlug] = useState('');
  const [city, setCity] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 板块数据
  const [boards, setCategories] = useState<Board[]>([]);
  const [generaList, setGeneraList] = useState<Board[]>([]);
  const [speciesList, setSpeciesList] = useState<Board[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 拉一级(科)
  useEffect(() => {
    api
      .get<Board[]>('/api/boards')
      .then((list) => {
        setCategories(list);
        if (!categorySlug && list[0]) setCategorySlug(list[0].slug);
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 科变化 → 拉属列表
  useEffect(() => {
    if (!categorySlug) {
      setGeneraList([]);
      setGenusSlug('');
      return;
    }
    api
      .get<{ genera: Board[] }>(`/api/boards/${encodeURIComponent(categorySlug)}`)
      .then((r) => setGeneraList(r.genera ?? []))
      .catch(() => setGeneraList([]));
  }, [categorySlug]);

  // 属变化 → 拉品种列表
  useEffect(() => {
    if (!genusSlug) {
      setSpeciesList([]);
      setSpeciesSlug('');
      return;
    }
    api
      .get<{ species: Board[] }>(
        `/api/genera/${encodeURIComponent(genusSlug)}?board=${encodeURIComponent(categorySlug)}`
      )
      .then((r) => setSpeciesList(r.species ?? []))
      .catch(() => setSpeciesList([]));
  }, [genusSlug, categorySlug]);

  // 更新单个商品
  const updateProduct = (id: string, patch: Partial<ProductItem>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  // 添加商品
  const addProduct = () => {
    if (products.length >= 10) return;
    setProducts((prev) => [...prev, emptyProduct()]);
  };

  // 删除商品
  const removeProduct = (id: string) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

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

    // 校验共享字段
    if (!categorySlug) return setErr('请选择板块');
    if (!city.trim()) return setErr('请输入发货城市');

    // 校验每个商品
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (!p.title.trim()) return setErr(`商品 ${i + 1}：请输入标题`);
      if (!p.priceYuan.trim()) return setErr(`商品 ${i + 1}：请输入售价`);
      const price = Math.round(Number(p.priceYuan) * 100);
      if (!Number.isFinite(price) || price <= 0) return setErr(`商品 ${i + 1}：售价格式不正确`);
      if (p.images.length === 0) return setErr(`商品 ${i + 1}：请上传至少一张图片`);
      if (!p.description.trim()) return setErr(`商品 ${i + 1}：请输入商品描述`);
    }

    setSubmitting(true);
    try {
      // 逐个提交商品
      const ids: string[] = [];
      for (const p of products) {
        const price = Math.round(Number(p.priceYuan) * 100);
        const r = await api.post<{ id: string }>('/api/market/products', {
          title: p.title,
          category: categorySlug,
          genus: genusSlug || undefined,
          species: speciesSlug || undefined,
          price,
          cover: p.images[0],
          images: p.images,
          description: p.description,
          tags,
          shipFrom: city,
        });
        ids.push(r.id);
      }
      toast.success('发布成功');
      setTimeout(() => router.push(`/market/${ids[0]}`), 1000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{t('market.sell.title')}</h1>
            <p className="text-sm text-leaf-700/70">{t('market.sell.subtitle')}</p>
          </div>

        <PermissionGate perm="market:sell">
          <div className="space-y-4">
            {/* 共享字段：板块品种 + 城市 */}
            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-ink-800">基本信息</h2>

              {/* 板块品种下拉联动 */}
              <Field label="板块品种">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    value={categorySlug}
                    onChange={(e) => {
                      setCategorySlug(e.target.value);
                      setGenusSlug('');
                      setSpeciesSlug('');
                    }}
                    className="input"
                  >
                    <option value="">-- 选择科 --</option>
                    {boards.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={genusSlug}
                    onChange={(e) => {
                      setGenusSlug(e.target.value);
                      setSpeciesSlug('');
                    }}
                    className="input"
                    disabled={!categorySlug || generaList.length === 0}
                  >
                    <option value="">
                      {!categorySlug
                        ? '请先选择科'
                        : generaList.length === 0
                        ? '暂无属'
                        : '-- 选择属 --'}
                    </option>
                    {generaList.map((g) => (
                      <option key={g.id} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={speciesSlug}
                    onChange={(e) => setSpeciesSlug(e.target.value)}
                    className="input"
                    disabled={!genusSlug || speciesList.length === 0}
                  >
                    <option value="">
                      {!genusSlug
                        ? '请先选择属'
                        : speciesList.length === 0
                        ? '暂无品种'
                        : '-- 选择品种（可选）--'}
                    </option>
                    {speciesList.map((s) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>

              {/* 城市 */}
              <Field label="发货城市">
                <input
                  className="input max-w-xs"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="如：广东广州"
                />
              </Field>
            </div>

            {/* 商品列表 */}
            {products.map((product, idx) => (
              <div key={product.id} className="card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-ink-800">
                    商品 {products.length > 1 ? idx + 1 : ''}
                  </h2>
                  {products.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeProduct(product.id)}
                      className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] text-rose-600 hover:bg-rose-50"
                    >
                      删除此商品
                    </button>
                  )}
                </div>

                {/* 标题 + 售价 */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_160px]">
                  <Field label="商品标题">
                    <input
                      className="input"
                      value={product.title}
                      onChange={(e) => updateProduct(product.id, { title: e.target.value.slice(0, 30) })}
                      placeholder="请输入商品标题"
                      maxLength={30}
                    />
                    <div className="mt-1 text-right text-[10px] text-leaf-700/50">
                      {product.title.length} / 30
                    </div>
                  </Field>
                  <Field label="售价（元）">
                    <input
                      className="input"
                      value={product.priceYuan}
                      onChange={(e) => updateProduct(product.id, { priceYuan: e.target.value })}
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </Field>
                </div>

                {/* 图片上传 */}
                <Field label="商品图片">
                  <UploadField
                    kind="image"
                    value={product.images}
                    onChange={(imgs) => updateProduct(product.id, { images: imgs })}
                    max={20}
                    showCropToggle
                  />
                  <div className="mt-1 text-[10px] text-leaf-700/60">第一张为封面图，最多 20 张，支持拖拽上传</div>
                </Field>

                {/* 商品描述 */}
                <Field label="商品描述">
                  <textarea
                    className="input min-h-[100px]"
                    value={product.description}
                    onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                    placeholder="描述一下商品的状态、养护情况、交易方式等"
                    maxLength={1000}
                  />
                  <div className="mt-1 text-right text-[10px] text-leaf-700/50">
                    {product.description.length} / 1000
                  </div>
                </Field>
              </div>
            ))}

            {/* 添加商品按钮 */}
            {products.length < 10 && (
              <button
                type="button"
                onClick={addProduct}
                className="w-full rounded-xl border-2 border-dashed border-leaf-200 py-4 text-sm text-leaf-600 hover:border-leaf-400 hover:bg-leaf-50/50 transition-colors"
              >
                + 添加更多商品
              </button>
            )}

            {/* 话题 */}
            <div className="card p-6 space-y-4">
              <h2 className="text-sm font-semibold text-ink-800">话题</h2>

              <Field label="话题">
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
                    placeholder={tags.length >= 6 ? '最多 6 个话题' : '输入话题后按回车'}
                    disabled={tags.length >= 6}
                  />
                </div>
              </Field>
            </div>

            {/* 错误提示 */}
            {err && (
              <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end gap-2">
              <Link href="/market" className="btn-outline">
                取消
              </Link>
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="btn-primary"
              >
                <Icon name="check" size={14} />
                {submitting ? '发布中...' : `发布${products.length > 1 ? products.length + '个' : ''}商品`}
              </button>
            </div>
          </div>
        </PermissionGate>
        </div>

        {/* 右侧边栏 */}
        <aside className="hidden xl:block">
          <div className="sticky top-[60px] max-h-[calc(100vh-72px)] overflow-y-auto flex flex-col justify-end">
            <UserAccountCard />
          </div>
        </aside>
      </div>
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
