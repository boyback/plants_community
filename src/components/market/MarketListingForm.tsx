'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form } from "radix-ui";
import { UserAccountCard } from '@/components/layout/UserAccountCard';
import { PermissionGate } from '@/components/ui/PermissionGate';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { BoardSelect, type BoardSelection } from '@/components/editor/BoardSelect';
import { useAuth } from '@/context/AuthContext';
import { api, ApiError } from "@/lib/client-api";
import { cn, formatPrice } from '@/lib/utils';
import { toast } from '@/components/ui/Toast';
import styles from './MarketListingForm.module.scss';
import { cx } from '@/lib/style-utils';



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

const TRADE_MODES: {key: TradeMode;title: string;desc: string;badge?: string;}[] = [
{
  key: 'platform_escrow',
  title: '平台担保',
  desc: '官方推荐，买家付款后平台协助担保，适合高价值交易。',
  badge: '推荐'
},
{
  key: 'online_payment',
  title: '在线支付',
  desc: '走支付宝在线下单，平台收取 1% 手续费。'
},
{
  key: 'external',
  title: '自行联系 / 三方平台',
  desc: '只展示联系方式或外部链接，不在站内生成订单。'
}];


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
    description: ''
  };
}

function toProductItem(
item: MarketListingFormValue['items'][number],
fallbackTaxons: BoardSelection[],
fallbackTags: string[])
: ProductItem {
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
    description: item.description
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
    initialValue?.tradeModes?.length ? initialValue.tradeModes : [initialValue?.tradeMode ?? 'platform_escrow']
  );
  const [externalUrl, setExternalUrl] = useState(initialValue?.externalUrl ?? '');
  const [contactNote, setContactNote] = useState(initialValue?.contactNote ?? '');
  const [products, setProducts] = useState<ProductItem[]>(
    initialValue?.items?.length ?
    initialValue.items.map((item) => toProductItem(item, initialValue?.taxons ?? [], initialValue?.tags ?? [])) :
    [emptyProduct()]
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Set<ValidationKey>>(new Set());

  const prices = useMemo(
    () =>
    products.
    map((item) => Math.round(Number(item.priceYuan) * 100)).
    filter((price) => Number.isFinite(price) && price > 0),
    [products]
  );
  const priceSummary = prices.length ?
  prices.length === 1 ?
  formatPrice(prices[0]) :
  `${formatPrice(Math.min(...prices))} - ${formatPrice(Math.max(...prices))}` :
  '未填写';

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
    setProducts((prev) => prev.map((item) => item.clientId === clientId ? { ...item, ...patch } : item));
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
      tags: products.find((item) => item.clientId === clientId)?.tags.filter((item) => item !== tag) ?? []
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
    if (errors.has('shipFrom')) toast.error('请输入发货地');else
    if (errors.has('tradeModes')) toast.error('请至少选择一种交易方式');else
    if (errors.has('externalContact')) toast.error('自行联系/三方平台交易请填写联系方式或外部链接');else
    if (errors.size > 0) toast.error('请完善商品必填信息');
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
      description: item.description.trim()
    }))
  });

  const submit = async () => {
    setErr(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = buildPayload();
      const result = isEdit && initialValue?.id ?
      await api.patch<{id: string;}>(`/api/market/listings/${initialValue.id}`, payload) :
      await api.post<{id: string;}>('/api/market/listings', payload);
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
    return <div className={cx(styles.r_1100bef6, styles.r_ca6bf630, styles.r_fc7473ca, styles.r_6c4cc49e)}>加载中...</div>;
  }

  if (!user) {
    return (
      <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
        <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>登录后才能{isEdit ? '编辑商品' : '发布商品'}</div>
        <Link href={`/login?redirect=${encodeURIComponent(isEdit && initialValue?.id ? `/market/${initialValue.id}/edit` : '/market/sell')}`} className={cx(styles.r_0ab86672, styles.r_52083e7d)}>
          去登录
        </Link>
      </div>);

  }

  const form =
  <Form.Root
    onInvalidCapture={() => setValidationErrors(getRequiredErrors())}
    onSubmit={(event) => {
      event.preventDefault();
      void submit();
    }}
    className={styles.r_3e7ce58d}>

      <section className={cx(styles.formCard, styles.r_3e7ce58d, styles.r_c07e54fd)}>
        <SectionTitle title="交易方式" desc="官方推荐平台担保，也允许用户自行联系。" />
        <Field
        name="tradeModes"
        label="交易方式"
        required
        invalid={validationErrors.has('tradeModes')}
        message="请至少选择一种交易方式"
        hiddenValue={tradeModes.join(',')}>

          <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_1004c0c3, styles.r_9a638cfe)}>
            {TRADE_MODES.map((modeItem) =>
          <button
            key={modeItem.key}
            type="button"
            onClick={() => toggleTradeMode(modeItem.key)}
            className={cn(cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_8e63407b, styles.r_2eba0d65, styles.r_ceb69a6b),

            tradeModes.includes(modeItem.key) ? cx(styles.r_3883b0f9, styles.r_7ebecbb6, styles.r_16b1efa5, styles.r_52c47100) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_a5c39c39),


            validationErrors.has('tradeModes') && cx(styles.r_3b7f9781, styles.r_fdae7b46)
            )}>

                <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
                  <span
                className={cn(cx(styles.r_f3c543ad, styles.r_11e59c6d, styles.r_dc7972eb, styles.r_67d66567, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_1dc571a3),

                tradeModes.includes(modeItem.key) ? cx(styles.r_3bd65fe8, styles.r_6bceb016, styles.r_72a4c7cd) : cx(styles.r_691861bc, styles.r_5e10cdb8, styles.r_f8c8e86d)


                )}>

                    ✓
                  </span>
                  <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{modeItem.title}</span>
                  {modeItem.badge &&
              <span className={cx(styles.r_ac204c10, styles.r_6bceb016, styles.r_45d82811, styles.r_465609a2, styles.r_1dc571a3, styles.r_72a4c7cd)}>
                      {modeItem.badge}
                    </span>
              }
                </div>
                <p className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_7054e276, styles.r_69335b95)}>{modeItem.desc}</p>
              </button>
          )}
          </div>
        </Field>

        {tradeModes.includes('external') &&
      <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_e4d6f343)}>
            <Field label="外部链接">
              <Input
            value={externalUrl}
            error={validationErrors.has('externalContact')}
            onChange={(e) => {
              setExternalUrl(e.target.value);
              if (e.target.value.trim() || contactNote.trim()) clearValidationError('externalContact');
            }}
            placeholder="可填写闲鱼、淘宝等链接" />

            </Field>
            <Field
          name="externalContact"
          label="联系方式 / 说明"
          required
          invalid={validationErrors.has('externalContact')}
          message="请填写联系方式或外部链接"
          hiddenValue={externalUrl.trim() || contactNote.trim()}>

              <Input
            value={contactNote}
            error={validationErrors.has('externalContact')}
            onChange={(e) => {
              setContactNote(e.target.value);
              if (e.target.value.trim() || externalUrl.trim()) clearValidationError('externalContact');
            }}
            maxLength={120}
            placeholder="例如：私信我确认库存" />

            </Field>
          </div>
      }
      </section>

      {products.map((product, idx) =>
    <section key={product.clientId} className={cx(styles.formCard, styles.r_3e7ce58d, styles.r_c07e54fd)}>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
            <SectionTitle
          title={`#${idx + 1}`}
          desc={idx === 0 ? '第一张图会作为商品封面。' : undefined} />

            {products.length > 1 &&
        <button
          type="button"
          onClick={() => removeProduct(product.clientId)}
          className={cx(styles.r_421ac2be, styles.r_ca6bcd4b, styles.r_959f4a9f, styles.r_0b91436d, styles.r_660d2eff, styles.r_359090c2, styles.r_595fceba, styles.r_85cfcc24)}>

                删除
              </button>
        }
          </div>

          <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_b28a6d85)}>
            <Field
          name={productFieldKey(product.clientId, 'title')}
          label="商品名称"
          required
          invalid={validationErrors.has(productFieldKey(product.clientId, 'title'))}
          message="请输入商品名称">

              <Input
            required
            value={product.title}
            error={validationErrors.has(productFieldKey(product.clientId, 'title'))}
            onChange={(e) => updateProduct(product.clientId, { title: e.target.value })}
            maxLength={50}
            showCount
            placeholder="例如：冰梅老桩" />

            </Field>
            <Field
          name={productFieldKey(product.clientId, 'priceYuan')}
          label="价格（元）"
          required
          invalid={validationErrors.has(productFieldKey(product.clientId, 'priceYuan'))}
          message="请输入有效价格">

              <Input
            required
            value={product.priceYuan}
            error={validationErrors.has(productFieldKey(product.clientId, 'priceYuan'))}
            onChange={(e) => updateProduct(product.clientId, { priceYuan: e.target.value })}
            inputMode="decimal"
            placeholder="0.00" />

            </Field>
            <Field
          name={productFieldKey(product.clientId, 'stock')}
          label="库存"
          required
          invalid={validationErrors.has(productFieldKey(product.clientId, 'stock'))}
          message="库存必须是正整数">

              <Input
            required
            value={product.stock}
            error={validationErrors.has(productFieldKey(product.clientId, 'stock'))}
            onChange={(e) => updateProduct(product.clientId, { stock: e.target.value })}
            inputMode="numeric"
            placeholder="1" />

            </Field>
          </div>

          <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_9a638cfe)}>
            <Field label="主头尺寸">
              <Input
            value={product.mainHeadSize}
            onChange={(e) => updateProduct(product.clientId, { mainHeadSize: e.target.value })}
            maxLength={40}
            placeholder="如：3.5cm" />

            </Field>
            <Field label="整体尺寸">
              <Input
            value={product.overallSize}
            onChange={(e) => updateProduct(product.clientId, { overallSize: e.target.value })}
            maxLength={40}
            placeholder="如：8cm × 7cm" />

            </Field>
            <Field label="花盆外径">
              <Input
            value={product.potDiameter}
            onChange={(e) => updateProduct(product.clientId, { potDiameter: e.target.value })}
            maxLength={40}
            placeholder="如：10cm" />

            </Field>
          </div>

          <div
        className={cn(cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985),

        idx === 0 ? styles.r_f6e004e6 : styles.r_ba6415cd


        )}>

            <Field
          name={productFieldKey(product.clientId, 'taxons')}
          label="板块 / 属 / 品种"
          required
          invalid={validationErrors.has(productFieldKey(product.clientId, 'taxons'))}
          message="请选择至少一个板块或品种"
          hiddenValue={product.taxons.map((item) => [item.categorySlug, item.genusSlug, item.speciesSlug].filter(Boolean).join('/')).join(',')}>

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
            max={12} />

              <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                可多选，用于这个商品的分类和搜索筛选。
              </div>
            </Field>

            <Field label="标签">
              <div className={cx(styles.r_60fbb771, styles.r_b6c95e22, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_58284b4e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_7660b450)}>
                {product.tags.map((tag) =>
            <span key={tag} className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_ac204c10, styles.r_f2b23104, styles.r_d5eab218, styles.r_465609a2, styles.r_359090c2, styles.r_5f6a59f1)}>
                    #{tag}
                    <button
                type="button"
                onClick={() => removeProductTag(product.clientId, tag)}
                className={cx(styles.r_b17d6a13, styles.r_5eca0425)}>

                      x
                    </button>
                  </span>
            )}
                <input
              className={cx(styles.r_a9ef791a, styles.r_36e579c0, styles.r_7f19cdf4, styles.r_d8e0e382, styles.r_fc7473ca, styles.r_df37b1fd)}
              value={product.tagInput}
              onChange={(e) => updateProduct(product.clientId, { tagInput: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addProductTag(product.clientId);
                }
              }}
              placeholder={product.tags.length >= 8 ? '最多 8 个标签' : '输入后回车'}
              disabled={product.tags.length >= 8} />

                <button type="button" onClick={() => addProductTag(product.clientId)} className={cx(styles.r_2964b067, styles.r_ebb407e8, styles.r_dd702538)}>
                  添加
                </button>
              </div>
              <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
                最多 8 个，用于搜索和推荐。
              </div>
            </Field>

            {idx === 0 &&
        <Field
          name="shipFrom"
          label="发货地"
          required
          invalid={validationErrors.has('shipFrom')}
          message="请输入发货地">

                <Input
            required
            value={shipFrom}
            error={validationErrors.has('shipFrom')}
            onChange={(e) => {
              setShipFrom(e.target.value);
              if (e.target.value.trim()) clearValidationError('shipFrom');
            }}
            maxLength={40}
            placeholder="如：广东广州" />

              </Field>
        }
          </div>

          <Field
        name={productFieldKey(product.clientId, 'images')}
        label="商品图片"
        required
        invalid={validationErrors.has(productFieldKey(product.clientId, 'images'))}
        message="请至少上传一张图片"
        hiddenValue={product.images.join(',')}>

            <MultiImageUploadGrid
          value={product.images}
          onChange={(images) => {
            updateProduct(product.clientId, { images });
            if (images.length > 0) clearValidationError(productFieldKey(product.clientId, 'images'));
          }}
          max={9}
          showCount={false}
          gridClassName={cx(styles.r_2fa962f1, styles.r_4b5cc19b, styles.r_77a2a20e)}
          tileClassName={cx(styles.r_0a769880, styles.r_ed831a4d, styles.r_5e10cdb8)}
          tileImageClassName={styles.r_7d85d0c2}
          firstItemLabel="封面"
          squareTiles />

            <div className={cx(styles.r_b6b02c0e, styles.r_d058ca6d, styles.r_6c4cc49e)}>
              最多 9 张。第一张作为商品封面，其余图片用于商品详情展示。
            </div>
          </Field>

          <Field
        name={productFieldKey(product.clientId, 'description')}
        label="商品描述"
        required
        invalid={validationErrors.has(productFieldKey(product.clientId, 'description'))}
        message="请输入商品描述">

            <Textarea
          required
          value={product.description}
          error={validationErrors.has(productFieldKey(product.clientId, 'description'))}
          onChange={(e) => updateProduct(product.clientId, { description: e.target.value })}
          maxLength={2000}
          showCount
          className={styles.r_6a5890f4}
          placeholder="描述尺寸、状态、瑕疵、养护环境、是否带盆土等。" />

          </Field>

        </section>
    )}

      {products.length < 20 &&
    <button
      type="button"
      onClick={addProduct}
      className={cx(styles.r_60fbb771, styles.r_6da6a3c3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_65935df5, styles.r_a29b7a64, styles.r_691861bc, styles.r_cb11fec3, styles.r_fc7473ca, styles.r_5f6a59f1, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_5756b7b4)}>

          <Icon name="plus" size={15} />
          添加商品
        </button>
    }

      {err && <div className={cx(styles.r_5f22e64f, styles.r_0759a0f1, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_b54428d1)}>{err}</div>}

      <div className={cx(styles.r_3e0fd166, styles.r_49af11eb, styles.r_236812d6, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_eb6e8b88, styles.r_21b12502, styles.r_0b2e8c28)}>
        <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div className={cx(styles.r_359090c2, styles.r_69335b95)}>
            共 <span className={cx(styles.r_e83a7042, styles.r_399e11a5)}>{products.length}</span> 个商品，价格区间：
            <span className={cx(styles.r_e83a7042, styles.r_595fceba)}>{priceSummary}</span>
          </div>
          <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
            <Link href={isEdit && initialValue?.id ? `/market/${initialValue.id}` : '/market'} className="btn-outline">
              取消
            </Link>
            <Form.Submit disabled={submitting} className="btn-primary">
              <Icon name="check" size={14} />
              {submitting ? isEdit ? '保存中...' : '发布中...' : isEdit ? '保存修改' : '发布商品'}
            </Form.Submit>
          </div>
        </div>
      </div>
    </Form.Root>;


  return (
    <div className={cx(styles.r_f3c543ad, styles.r_d7c83398, styles.r_0d304f90, styles.r_4c57394d)}>
      <main className={styles.r_7e0b7cdf}>
        <div className={cx(styles.r_da019856, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_1004c0c3)}>
          <div>
            <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_399e11a5)}>{isEdit ? '编辑商品' : '发布商品'}</h1>
            <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>
              填写商品信息、品种分类、发货地和交易方式后即可发布。
            </p>
          </div>
          <Link href={isEdit && initialValue?.id ? `/market/${initialValue.id}` : '/market'} className="btn-outline">
            {isEdit ? '返回商品' : '返回交易中心'}
          </Link>
        </div>

        {isEdit ? form : <PermissionGate perm="market:sell">{form}</PermissionGate>}
      </main>

      <aside className={cx(styles.r_99d72c7f, styles.r_c830740d)}>
        <div className={cx(styles.r_3e0fd166, styles.r_317cfdc3, styles.r_2d538599, styles.r_92bf82f4)}>
          <UserAccountCard />
        </div>
      </aside>
    </div>);

}

function Field({
  label,
  name,
  required,
  invalid,
  message,
  hiddenValue,
  children








}: {label: string;name?: string;required?: boolean;invalid?: boolean;message?: string;hiddenValue?: string;children: React.ReactNode;}) {
  if (name) {
    return (
      <Form.Field name={name} serverInvalid={invalid}>
        <Form.Label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
          {required && <span className={styles.r_fa512798}>*</span>} {label}
        </Form.Label>
        {hiddenValue !== undefined &&
        <Form.Control
          value={hiddenValue}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden
          className={styles.r_2daa8e5e} />

        }
        {children}
        {message &&
        <Form.Message
          match="valueMissing"
          forceMatch={invalid}
          className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

            {message}
          </Form.Message>
        }
      </Form.Field>);

  }

  return (
    <div>
      <label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{label}</label>
      {children}
    </div>);

}

function SectionTitle({ title, desc }: {title: string;desc?: string;}) {
  return (
    <div>
      <h2 className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{title}</h2>
      {desc && <p className={cx(styles.r_15e1b1f4, styles.r_359090c2, styles.r_6c4cc49e)}>{desc}</p>}
    </div>);

}
