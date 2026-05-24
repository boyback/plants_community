'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from '@/lib/client-api';
import { formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';

type TradeMode = 'platform_escrow' | 'online_payment' | 'external';

interface ProductItem {
  id?: string;
  clientId: string;
  title: string;
  priceYuan: string;
  stock: string;
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
    images: [],
    description: '',
  };
}

function toProductItem(item: MarketListingFormValue['items'][number]): ProductItem {
  return {
    id: item.id,
    clientId: item.id ?? createClientId(),
    title: item.title,
    priceYuan: item.price ? String(item.price / 100) : '',
    stock: String(item.stock || 1),
    images: item.images,
    description: item.description,
  };
}

export function MarketListingForm({ mode, initialValue }: Props) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isEdit = mode === 'edit';

  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [taxons, setTaxons] = useState<BoardSelection[]>(initialValue?.taxons ?? []);
  const [shipFrom, setShipFrom] = useState(initialValue?.shipFrom ?? '');
  const [description, setDescription] = useState(initialValue?.description ?? '');
  const [tradeModes, setTradeModes] = useState<TradeMode[]>(
    initialValue?.tradeModes?.length ? initialValue.tradeModes : [initialValue?.tradeMode ?? 'platform_escrow'],
  );
  const [externalUrl, setExternalUrl] = useState(initialValue?.externalUrl ?? '');
  const [contactNote, setContactNote] = useState(initialValue?.contactNote ?? '');
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [products, setProducts] = useState<ProductItem[]>(
    initialValue?.items?.length ? initialValue.items.map(toProductItem) : [emptyProduct()],
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  const updateProduct = (clientId: string, patch: Partial<ProductItem>) => {
    setProducts((prev) => prev.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item)));
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
  };

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '');
    if (!value || tags.includes(value) || tags.length >= 8) return;
    setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const validate = () => {
    if (!title.trim()) return '请输入交易帖标题';
    if (taxons.length === 0) return '请选择至少一个板块或品种';
    if (!shipFrom.trim()) return '请输入发货地';
    if (tradeModes.length === 0) return '请至少选择一种交易方式';
    if (tradeModes.includes('external') && !externalUrl.trim() && !contactNote.trim()) {
      return '自行联系/三方平台交易请填写联系方式或外部链接';
    }

    for (let i = 0; i < products.length; i += 1) {
      const item = products[i];
      const prefix = `商品 ${i + 1}`;
      const price = Math.round(Number(item.priceYuan) * 100);
      const stock = Number(item.stock);
      if (!item.title.trim()) return `${prefix}：请输入名称`;
      if (!Number.isFinite(price) || price <= 0) return `${prefix}：价格格式不正确`;
      if (!Number.isInteger(stock) || stock <= 0) return `${prefix}：库存必须是正整数`;
      if (item.images.length === 0) return `${prefix}：请至少上传一张图片`;
      if (item.images.length > 9) return `${prefix}：图片最多 9 张`;
      if (!item.description.trim()) return `${prefix}：请输入描述`;
    }
    return null;
  };

  const buildPayload = () => ({
    title: title.trim(),
    category: taxons[0].categorySlug,
    genus: taxons[0].genusSlug || undefined,
    species: taxons[0].speciesSlug || undefined,
    taxons,
    shipFrom: shipFrom.trim(),
    description: description.trim() || undefined,
    tradeMode: tradeModes[0] ?? 'platform_escrow',
    tradeModes,
    externalUrl: externalUrl.trim() || undefined,
    contactNote: contactNote.trim() || undefined,
    tags,
    items: products.map((item) => ({
      id: item.id,
      title: item.title.trim(),
      price: Math.round(Number(item.priceYuan) * 100),
      stock: Math.max(1, Number(item.stock) || 1),
      images: item.images,
      description: item.description.trim(),
    })),
  });

  const submit = async () => {
    setErr(null);
    const message = validate();
    if (message) {
      setErr(message);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const result = isEdit && initialValue?.id
        ? await api.patch<{ id: string }>(`/api/market/listings/${initialValue.id}`, payload)
        : await api.post<{ id: string }>('/api/market/listings', payload);
      toast.success(isEdit ? '保存成功' : '发布成功');
      router.push(`/market/${result.id}`);
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
        <div className="text-lg font-semibold">登录后才能{isEdit ? '编辑交易帖' : '发布商品'}</div>
        <Link href={`/login?redirect=${encodeURIComponent(isEdit && initialValue?.id ? `/market/${initialValue.id}/edit` : '/market/sell')}`} className="btn-primary mt-4 inline-flex">
          去登录
        </Link>
      </div>
    );
  }

  const form = (
    <div className="space-y-4">
      <section className="card space-y-4 p-5">
        <SectionTitle title="基本信息" desc="这些信息作用于整个交易帖。" />
        <Field label="交易帖标题">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            showCount
            placeholder="例如：春季出几棵状态不错的拟石莲"
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px]">
          <Field label="板块 / 属 / 品种">
            <BoardSelect
              multiple
              values={taxons}
              onValuesChange={setTaxons}
              apiPath="/api/boards?kind=family&withSpecies=1"
              placeholder="搜索并选择一个或多个品种"
              max={12}
            />
            <div className="mt-1 text-[11px] text-leaf-700/60">
              可多选，适合一个交易帖下包含多个品种；第一个选择会作为列表筛选主分类。
            </div>
          </Field>
          <Field label="发货地">
            <Input
              value={shipFrom}
              onChange={(e) => setShipFrom(e.target.value)}
              maxLength={40}
              placeholder="如：广东广州"
            />
          </Field>
        </div>

        <Field label="交易帖说明">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            showCount
            className="min-h-[96px]"
            placeholder="可补充打包规则、发货时间、售后说明等。"
          />
        </Field>
      </section>

      <section className="card space-y-4 p-5">
        <SectionTitle title="交易方式" desc="官方推荐平台担保，也允许用户自行联系。" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TRADE_MODES.map((modeItem) => (
            <button
              key={modeItem.key}
              type="button"
              onClick={() => toggleTradeMode(modeItem.key)}
              className={[
                'rounded-lg border p-4 text-left transition-colors',
                tradeModes.includes(modeItem.key)
                  ? 'border-leaf-400 bg-leaf-50 ring-2 ring-leaf-100'
                  : 'border-leaf-100 bg-white hover:border-leaf-300',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'grid h-4 w-4 place-items-center rounded border text-[10px]',
                    tradeModes.includes(modeItem.key)
                      ? 'border-leaf-600 bg-leaf-600 text-white'
                      : 'border-leaf-200 bg-white text-transparent',
                  ].join(' ')}
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

        {tradeModes.includes('external') && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="外部链接">
              <Input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="可填写闲鱼、淘宝等链接"
              />
            </Field>
            <Field label="联系方式 / 说明">
              <Input
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
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
              title={`商品 ${idx + 1}`}
              desc={idx === 0 ? '第一张图会作为交易帖封面。' : undefined}
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
            <Field label="商品名称">
              <Input
                value={product.title}
                onChange={(e) => updateProduct(product.clientId, { title: e.target.value })}
                maxLength={50}
                showCount
                placeholder="例如：冰梅老桩"
              />
            </Field>
            <Field label="价格（元）">
              <Input
                value={product.priceYuan}
                onChange={(e) => updateProduct(product.clientId, { priceYuan: e.target.value })}
                inputMode="decimal"
                placeholder="0.00"
              />
            </Field>
            <Field label="库存">
              <Input
                value={product.stock}
                onChange={(e) => updateProduct(product.clientId, { stock: e.target.value })}
                inputMode="numeric"
                placeholder="1"
              />
            </Field>
          </div>

          <Field label="商品图片">
            <MultiImageUploadGrid
              value={product.images}
              onChange={(images) => updateProduct(product.clientId, { images })}
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

          <Field label="商品描述">
            <Textarea
              value={product.description}
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

      <section className="card space-y-4 p-5">
        <SectionTitle title="标签" desc="用于交易中心搜索和推荐。" />
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-leaf-200 bg-white p-2">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700">
              #{tag}
              <button
                type="button"
                onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}
                className="text-leaf-600 hover:text-leaf-900"
              >
                x
              </button>
            </span>
          ))}
          <input
            className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={tags.length >= 8 ? '最多 8 个标签' : '输入标签后按回车'}
            disabled={tags.length >= 8}
          />
          <button type="button" onClick={addTag} className="btn-outline !px-2.5 !py-1 !text-xs">
            添加
          </button>
        </div>
      </section>

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
            <button type="button" onClick={submit} disabled={submitting} className="btn-primary">
              <Icon name="check" size={14} />
              {submitting ? (isEdit ? '保存中...' : '发布中...') : (isEdit ? '保存修改' : '发布交易帖')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
      <main className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-800">{isEdit ? '编辑交易帖' : '发布交易帖'}</h1>
            <p className="mt-1 text-sm text-leaf-700/70">
              一个交易帖可以放多个商品，后续会统一进入交易中心展示。
            </p>
          </div>
          <Link href={isEdit && initialValue?.id ? `/market/${initialValue.id}` : '/market'} className="btn-outline">
            {isEdit ? '返回交易帖' : '返回交易中心'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-leaf-700/80">{label}</label>
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
