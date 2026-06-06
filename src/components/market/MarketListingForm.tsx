'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from 'radix-ui';
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { cn, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

type TradeMode = 'platform_escrow' | 'online_payment' | 'external';
type ValidationKey = string;

interface ProductItem {
  id?: string;
  clientId: string;
  title: string;
  priceYuan: string;
  stock: string;
  mainHeadSize: string;
  overallSize: string;
  potDiameter: string;
  taxons: BoardSelection[];
  tags: string[];
  tagInput: string;
  images: string[];
  description: string;
}

export interface MarketListingFormValue {
  id?: string;
  title: string;
  taxons: BoardSelection[];
  shipFrom: string;
  description: string;
  tradeMode: TradeMode;
  tradeModes?: TradeMode[];
  externalUrl: string;
  contactNote: string;
  tags: string[];
  items: {
    id?: string;
    title: string;
    price: number;
    stock: number;
    mainHeadSize?: string | null;
    overallSize?: string | null;
    potDiameter?: string | null;
    taxons?: BoardSelection[];
    tags?: string[];
    images: string[];
    description: string;
  }[];
}

interface Props {
  mode: 'create' | 'edit';
  initialValue?: MarketListingFormValue;
}

const TRADE_MODES: { key: TradeMode; title: string; desc: string; badge?: string }[] = [
  {
    key: 'platform_escrow',
    title: '平台担保',
    desc: '官方推荐，买家付款后平台协助担保，适合高价值交易。',
    badge: '推荐',
  },
  {
    key: 'online_payment',
    title: '在线支付',
    desc: '走支付宝在线下单，平台收取 1% 手续费。',
  },
  {
    key: 'external',
    title: '自行联系 / 三方平台',
    desc: '只展示联系方式或外部链接，不在站内生成订单。',
  },
];

function createClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyProduct(): ProductItem {
  return {
    clientId: createClientId(),
    title: '',
    priceYuan: '',
    stock: '1',
    mainHeadSize: '',
    overallSize: '',
    potDiameter: '',
    taxons: [],
    tags: [],
    tagInput: '',
    images: [],
    description: '',
  };
}

function toProductItem(
  item: MarketListingFormValue['items'][number],
  fallbackTaxons: BoardSelection[],
  fallbackTags: string[],
): ProductItem {
  return {
    id: item.id,
    clientId: item.id ?? createClientId(),
    title: item.title,
    priceYuan: item.price ? String(item.price / 100) : '',
    stock: String(item.stock || 1),
    mainHeadSize: item.mainHeadSize ?? '',
    overallSize: item.overallSize ?? '',
    potDiameter: item.potDiameter ?? '',
    taxons: item.taxons !== undefined ? item.taxons : fallbackTaxons,
    tags: item.tags !== undefined ? item.tags : fallbackTags,
    tagInput: '',
    images: item.images,
    description: item.description,
  };
}

function mergeTaxons(taxons: BoardSelection[]) {
  const seen = new Set<string>();
  return taxons.filter((item) => {
    const key = `${item.categorySlug}:${item.genusSlug}:${item.speciesSlug}`;
    if (!item.categorySlug || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function MarketListingForm({ mode, initialValue }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isEdit = mode === 'edit';
  const firstInitialProduct = initialValue?.items?.[0];

  const title = initialValue?.title ?? firstInitialProduct?.title ?? '';
  const [shipFrom, setShipFrom] = useState(initialValue?.shipFrom ?? '');
  const description = initialValue?.description ?? firstInitialProduct?.description ?? '';
  const [tradeModes, setTradeModes] = useState<TradeMode[]>(
    initialValue?.tradeModes?.length ? initialValue.tradeModes : [initialValue?.tradeMode ?? 'platform_escrow'],
  );
  const [externalUrl, setExternalUrl] = useState(initialValue?.externalUrl ?? '');
  const [contactNote, setContactNote] = useState(initialValue?.contactNote ?? '');
  const [products, setProducts] = useState<ProductItem[]>(
    initialValue?.items?.length
      ? initialValue.items.map((item) => toProductItem(item, initialValue?.taxons ?? [], initialValue?.tags ?? []))
      : [emptyProduct()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<ValidationKey>>(new Set());

  const prices = useMemo(
    () =>
      products
        .map((item) => Math.round(Number(item.priceYuan) * 100))
        .filter((price) => Number.isFinite(price) && price > 0),
    [products],
  );
  const priceSummary = prices.length
    ? prices.length === 1
      ? formatPrice(prices[0])
      : `${formatPrice(Math.min(...prices))} - ${formatPrice(Math.max(...prices))}`
    : '未填写';

  const clearValidationError = (key: ValidationKey) => {
    setValidationErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const productFieldKey = (clientId: string, field: string) => `product:${clientId}:${field}`;

  const updateProduct = (clientId: string, patch: Partial<ProductItem>) => {
    setProducts((prev) => prev.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)));
    Object.keys(patch).forEach((field) => clearValidationError(productFieldKey(clientId, field)));
  };

  const addProductTag = (clientId: string) => {
    setProducts((prev) => prev.map((item) => {
      if (item.clientId !== clientId) return item;
      const value = item.tagInput.trim().replace(/^#/, '');
      if (!value || item.tags.includes(value) || item.tags.length >= 8) return item;
      return { ...item, tags: [...item.tags, value], tagInput: '' };
    }));
  };

  const removeProductTag = (clientId: string, tag: string) => {
    updateProduct(clientId, {
      tags: products.find((item) => item.clientId === clientId)?.tags.filter((item) => item !== tag) ?? [],
    });
  };

  const addProduct = () => {
    if (products.length >= 20) return;
    setProducts((prev) => [...prev, emptyProduct()]);
  };

  const removeProduct = (clientId: string) => {
    if (products.length <= 1) return;
    setProducts((prev) => prev.filter((item) => item.clientId !== clientId));
  };

  const toggleTradeMode = (mode: TradeMode) => {
    setTradeModes((prev) => {
      if (prev.includes(mode)) {
        return prev.length > 1 ? prev.filter((item) => item !== mode) : prev;
      }
      return [...prev, mode];
    });
    clearValidationError('tradeModes');
    clearValidationError('externalContact');
  };

  const listingTaxons = mergeTaxons(products.flatMap((item) => item.taxons));
  const listingTags = Array.from(new Set(products.flatMap((item) => item.tags))).slice(0, 8);

  const getRequiredErrors = () => {
    const errors = new Set<ValidationKey>();
    if (!shipFrom.trim()) errors.add('shipFrom');
    if (tradeModes.length === 0) errors.add('tradeModes');
    if (tradeModes.includes('external') && !externalUrl.trim() && !contactNote.trim()) {
      errors.add('externalContact');
    }

    for (let i = 0; i < products.length; i += 1) {
      const item = products[i];
      const price = Math.round(Number(item.priceYuan) * 100);
      const stock = Number(item.stock);
      if (!item.title.trim()) errors.add(productFieldKey(item.clientId, 'title'));
      if (!Number.isFinite(price) || price <= 0) errors.add(productFieldKey(item.clientId, 'priceYuan'));
      if (!Number.isInteger(stock) || stock <= 0) errors.add(productFieldKey(item.clientId, 'stock'));
      if (item.taxons.length === 0) errors.add(productFieldKey(item.clientId, 'taxons'));
      if (item.images.length === 0 || item.images.length > 9) errors.add(productFieldKey(item.clientId, 'images'));
      if (!item.description.trim()) errors.add(productFieldKey(item.clientId, 'description'));
    }

    return errors;
  };

  const validate = () => {
    const errors = getRequiredErrors();
    setValidationErrors(errors);
    if (errors.has('shipFrom')) toast.error('请输入发货地');
    else if (errors.has('tradeModes')) toast.error('请至少选择一种交易方式');
    else if (errors.has('externalContact')) toast.error('自行联系/三方平台交易请填写联系方式或外部链接');
    else if (errors.size > 0) toast.error('请完善商品必填信息');
    return errors.size === 0;
  };

  const buildPayload = () => ({
    title: products[0]?.title.trim() || title.trim(),
    category: listingTaxons[0].categorySlug,
    genus: listingTaxons[0].genusSlug || undefined,
    species: listingTaxons[0].speciesSlug || undefined,
    taxons: listingTaxons,
    shipFrom: shipFrom.trim(),
    description: products[0]?.description.trim() || description.trim() || undefined,
    tradeMode: tradeModes[0] ?? 'platform_escrow',
    tradeModes,
    externalUrl: externalUrl.trim() || undefined,
    contactNote: contactNote.trim() || undefined,
    tags: listingTags,
    items: products.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      price: Math.round(Number(item.priceYuan) * 100),
      stock: Math.max(1, Number(item.stock) || 1),
      mainHeadSize: item.mainHeadSize.trim() || undefined,
      overallSize: item.overallSize.trim() || undefined,
      potDiameter: item.potDiameter.trim() || undefined,
      taxons: item.taxons,
      tags: item.tags,
      images: item.images,
      description: item.description.trim(),
    })),
  });

  const submit = async () => {
    setErr(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const result = isEdit && initialValue?.id
        ? await api.patch<{ id: string }>(`/api/market/listings/${initialValue.id}`, payload)
        : await api.post<{ id: string }>('/api/market/listings', payload);
      toast.success(isEdit ? '保存成功' : '发布成功');
      router.push(isEdit ? `/market/${result.id}` : '/market');
      router.refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : isEdit ? '保存失败' : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-10 text-center text-sm text-leaf-700/60">加载中...</div>;
  }

  if (!user) {
    return (
      <div className="card mx-auto max-w-md p-10 text-center">
        <div className="text-lg font-semibold">登录后才能{isEdit ? '编辑商品' : '发布商品'}</div>
        <Link href={`/login?redirect=${encodeURIComponent(isEdit && initialValue?.id ? `/market/${initialValue.id}/edit` : '/market/sell')}`} className="btn-primary mt-4 inline-flex">
          去登录
        </Link>
      </div>
    );
  }

  const form = (
    <Form.Root
      onInvalidCapture={() => setValidationErrors(getRequiredErrors())}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4"
    >
      <section className="card space-y-4 p-5">
        <SectionTitle title="交易方式" desc="官方推荐平台担保，也允许用户自行联系。" />
        <Field
          name="tradeModes"
          label="交易方式"
          required
          invalid={validationErrors.has('tradeModes')}
          message="请至少选择一种交易方式"
          hiddenValue={tradeModes.join(',')}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {TRADE_MODES.map((modeItem) => (
              <button
                key={modeItem.key}
                type="button"
                onClick={() => toggleTradeMode(modeItem.key)}
                className={cn(
                  'rounded-lg border p-4 text-left transition-colors',
                  tradeModes.includes(modeItem.key)
                    ? 'border-leaf-400 bg-leaf-50 ring-2 ring-leaf-100'
                    : 'border-leaf-100 bg-white hover:border-leaf-300',
                  validationErrors.has('tradeModes') && 'border-rose-300 bg-rose-50/30',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'grid h-4 w-4 place-items-center rounded border text-[10px]',
                      tradeModes.includes(modeItem.key)
                        ? 'border-leaf-600 bg-leaf-600 text-white'
                        : 'border-leaf-200 bg-white text-transparent',
                    )}
                  >
                    ✓
                  </span>
                  <span className="font-semibold text-ink-800">{modeItem.title}</span>
                  {modeItem.badge && (
                    <span className="rounded-full bg-leaf-600 px-1.5 py-0.5 text-[10px] text-white">
                      {modeItem.badge}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-5 text-leaf-700/70">{modeItem.desc}</p>
              </button>
            ))}
          </div>
        </Field>

        {tradeModes.includes('external') && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="外部链接">
              <Input
                value={externalUrl}
                error={validationErrors.has('externalContact')}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  if (e.target.value.trim() || contactNote.trim()) clearValidationError('externalContact');
                }}
                placeholder="可填写闲鱼、淘宝等链接"
              />
            </Field>
            <Field
              name="externalContact"
              label="联系方式 / 说明"
              required
              invalid={validationErrors.has('externalContact')}
              message="请填写联系方式或外部链接"
              hiddenValue={externalUrl.trim() || contactNote.trim()}
            >
              <Input
                value={contactNote}
                error={validationErrors.has('externalContact')}
                onChange={(e) => {
                  setContactNote(e.target.value);
                  if (e.target.value.trim() || externalUrl.trim()) clearValidationError('externalContact');
                }}
                maxLength={120}
                placeholder="例如：私信我确认库存"
              />
            </Field>
          </div>
        )}
      </section>

      {products.map((product, idx) => (
        <section key={product.clientId} className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle
              title={`#${idx + 1}`}
              desc={idx === 0 ? '第一张图会作为商品封面。' : undefined}
            />
            {products.length > 1 && (
              <button
                type="button"
                onClick={() => removeProduct(product.clientId)}
                className="rounded-md border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50"
              >
                删除
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_160px_120px]">
            <Field
              name={productFieldKey(product.clientId, 'title')}
              label="商品名称"
              required
              invalid={validationErrors.has(productFieldKey(product.clientId, 'title'))}
              message="请输入商品名称"
            >
              <Input
                required
                value={product.title}
                error={validationErrors.has(productFieldKey(product.clientId, 'title'))}
                onChange={(e) => updateProduct(product.clientId, { title: e.target.value })}
                maxLength={50}
                showCount
                placeholder="例如：冰梅老桩"
              />
            </Field>
            <Field
              name={productFieldKey(product.clientId, 'priceYuan')}
              label="价格（元）"
              required
              invalid={validationErrors.has(productFieldKey(product.clientId, 'priceYuan'))}
              message="请输入有效价格"
            >
              <Input
                required
                value={product.priceYuan}
                error={validationErrors.has(productFieldKey(product.clientId, 'priceYuan'))}
                onChange={(e) => updateProduct(product.clientId, { priceYuan: e.target.value })}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>
            <Field
              name={productFieldKey(product.clientId, 'stock')}
              label="库存"
              required
              invalid={validationErrors.has(productFieldKey(product.clientId, 'stock'))}
              message="库存必须是正整数"
            >
              <Input
                required
                value={product.stock}
                error={validationErrors.has(productFieldKey(product.clientId, 'stock'))}
                onChange={(e) => updateProduct(product.clientId, { stock: e.target.value })}
                inputMode="numeric"
                placeholder="1"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="主头尺寸">
              <Input
                value={product.mainHeadSize}
                onChange={(e) => updateProduct(product.clientId, { mainHeadSize: e.target.value })}
                maxLength={40}
                placeholder="如：3.5cm"
              />
            </Field>
            <Field label="整体尺寸">
              <Input
                value={product.overallSize}
                onChange={(e) => updateProduct(product.clientId, { overallSize: e.target.value })}
                maxLength={40}
                placeholder="如：8cm × 7cm"
              />
            </Field>
            <Field label="花盆外径">
              <Input
                value={product.potDiameter}
                onChange={(e) => updateProduct(product.clientId, { potDiameter: e.target.value })}
                maxLength={40}
                placeholder="如：10cm"
              />
            </Field>
          </div>

          <div
            className={cn(
              'grid grid-cols-1 gap-4',
              idx === 0
                ? 'lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)_180px]'
                : 'lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]',
            )}
          >
            <Field
              name={productFieldKey(product.clientId, 'taxons')}
              label="板块 / 属 / 品种"
              required
              invalid={validationErrors.has(productFieldKey(product.clientId, 'taxons'))}
              message="请选择至少一个板块或品种"
              hiddenValue={product.taxons.map((item) => [item.categorySlug, item.genusSlug, item.speciesSlug].filter(Boolean).join('/')).join(',')}
            >
              <BoardSelect
                multiple
                values={product.taxons}
                onValuesChange={(next) => {
                  updateProduct(product.clientId, { taxons: next });
                  if (next.length > 0) clearValidationError(productFieldKey(product.clientId, 'taxons'));
                }}
                apiPath="/api/boards?kind=family&withSpecies=1"
                placeholder="搜索并选择一个或多个品种"
                invalid={validationErrors.has(productFieldKey(product.clientId, 'taxons'))}
                max={12}
              />
              <div className="mt-1 text-[11px] text-leaf-700/60">
                可多选，用于这个商品的分类和搜索筛选。
              </div>
            </Field>

            <Field label="标签">
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-leaf-200 bg-white p-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeProductTag(product.clientId, tag)}
                      className="text-leaf-600 hover:text-leaf-900"
                    >
                      x
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none"
                  value={product.tagInput}
                  onChange={(e) => updateProduct(product.clientId, { tagInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addProductTag(product.clientId);
                    }
                  }}
                  placeholder={product.tags.length >= 8 ? '最多 8 个标签' : '输入后回车'}
                  disabled={product.tags.length >= 8}
                />
                <button type="button" onClick={() => addProductTag(product.clientId)} className="btn-outline !px-2.5 !py-1 !text-xs">
                  添加
                </button>
              </div>
              <div className="mt-1 text-[11px] text-leaf-700/60">
                最多 8 个，用于搜索和推荐。
              </div>
            </Field>

            {idx === 0 && (
              <Field
                name="shipFrom"
                label="发货地"
                required
                invalid={validationErrors.has('shipFrom')}
                message="请输入发货地"
              >
                <Input
                  required
                  value={shipFrom}
                  error={validationErrors.has('shipFrom')}
                  onChange={(e) => {
                    setShipFrom(e.target.value);
                    if (e.target.value.trim()) clearValidationError('shipFrom');
                  }}
                  maxLength={40}
                  placeholder="如：广东广州"
                />
              </Field>
            )}
          </div>

          <Field
            name={productFieldKey(product.clientId, 'images')}
            label="商品图片"
            required
            invalid={validationErrors.has(productFieldKey(product.clientId, 'images'))}
            message="请至少上传一张图片"
            hiddenValue={product.images.join(',')}
          >
            <MultiImageUploadGrid
              value={product.images}
              onChange={(images) => {
                updateProduct(product.clientId, { images });
                if (images.length > 0) clearValidationError(productFieldKey(product.clientId, 'images'));
              }}
              max={9}
              showCount={false}
              gridClassName="grid-cols-[repeat(auto-fill,80px)] justify-start gap-2"
              tileClassName="h-20 w-20 bg-white"
              tileImageClassName="object-cover"
              firstItemLabel="封面"
              squareTiles
            />
            <div className="mt-1 text-[11px] text-leaf-700/60">
              最多 9 张。第一张作为商品封面，其余图片用于商品详情展示。
            </div>
          </Field>

          <Field
            name={productFieldKey(product.clientId, 'description')}
            label="商品描述"
            required
            invalid={validationErrors.has(productFieldKey(product.clientId, 'description'))}
            message="请输入商品描述"
          >
            <Textarea
              required
              value={product.description}
              error={validationErrors.has(productFieldKey(product.clientId, 'description'))}
              onChange={(e) => updateProduct(product.clientId, { description: e.target.value })}
              maxLength={2000}
              showCount
              className="min-h-[112px]"
              placeholder="描述尺寸、状态、瑕疵、养护环境、是否带盆土等。"
            />
          </Field>

        </section>
      ))}

      {products.length < 20 && (
        <button
          type="button"
          onClick={addProduct}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-leaf-200 py-4 text-sm text-leaf-700 transition-colors hover:border-leaf-400 hover:bg-leaf-50"
        >
          <Icon name="plus" size={15} />
          添加商品
        </button>
      )}

      {err && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <div className="sticky bottom-3 z-10 rounded-xl border border-leaf-100 bg-white/95 p-3 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-leaf-700/70">
            共 <span className="font-semibold text-ink-800">{products.length}</span> 个商品，价格区间：
            <span className="font-semibold text-rose-600">{priceSummary}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={isEdit && initialValue?.id ? `/market/${initialValue.id}` : '/market'} className="btn-outline">
              取消
            </Link>
            <Form.Submit disabled={submitting} className="btn-primary">
              <Icon name="check" size={14} />
              {submitting ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存修改' : '发布商品')}
            </Form.Submit>
          </div>
        </div>
      </div>
    </Form.Root>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
      <main className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-800">{isEdit ? '编辑商品' : '发布商品'}</h1>
            <p className="mt-1 text-sm text-leaf-700/70">
              填写商品信息、品种分类、发货地和交易方式后即可发布。
            </p>
          </div>
          <Link href={isEdit && initialValue?.id ? `/market/${initialValue.id}` : '/market'} className="btn-outline">
            {isEdit ? '返回商品' : '返回交易中心'}
          </Link>
        </div>

        {isEdit ? form : <PermissionGate perm="market:sell">{form}</PermissionGate>}
      </main>

      <aside className="hidden xl:block">
        <div className="sticky top-[60px] max-h-[calc(100vh-72px)] overflow-y-auto">
          <UserAccountCard />
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  name,
  required,
  invalid,
  message,
  hiddenValue,
  children,
}: {
  label: string;
  name?: string;
  required?: boolean;
  invalid?: boolean;
  message?: string;
  hiddenValue?: string;
  children: React.ReactNode;
}) {
  if (name) {
    return (
      <Form.Field name={name} serverInvalid={invalid}>
        <Form.Label className="mb-1.5 block text-sm font-semibold text-ink-800">
          {required && <span className="text-rose-500">*</span>} {label}
        </Form.Label>
        {hiddenValue !== undefined && (
          <Form.Control
            value={hiddenValue}
            required={required}
            readOnly
            tabIndex={-1}
            aria-hidden
            className="sr-only"
          />
        )}
        {children}
        {message && (
          <Form.Message
            match="valueMissing"
            forceMatch={invalid}
            className="mt-1.5 block text-xs text-rose-600"
          >
            {message}
          </Form.Message>
        )}
      </Form.Field>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink-800">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-ink-800">{title}</h2>
      {desc && <p className="mt-0.5 text-xs text-leaf-700/60">{desc}</p>}
    </div>
  );
}
