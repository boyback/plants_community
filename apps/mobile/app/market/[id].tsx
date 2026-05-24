import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { ImagePreview } from '../../components/ImagePreview';
import {
  absoluteAssetUrl,
  apiGet,
  apiPatch,
  apiPost,
  ApiError,
  type AddressSummary,
  type AuthMe,
  type MarketListingDetail,
} from '../../lib/api';
import { formatPrice, stripHtml } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

type TradeMode = MarketListingDetail['tradeMode'];
type BuyDraft = {
  itemId: string;
  quantity: string;
  tradeMode: TradeMode;
  addressId: string;
  shipName: string;
  shipPhone: string;
  shipAddress: string;
};

export default function MarketDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<MarketListingDetail | null>(null);
  const [me, setMe] = useState<AuthMe['user'] | null>(null);
  const [addresses, setAddresses] = useState<AddressSummary[]>([]);
  const [comments, setComments] = useState<MarketListingDetail['comments']>([]);
  const [collectState, setCollectState] = useState<Record<string, { collected: boolean; total: number }>>({});
  const [commentText, setCommentText] = useState('');
  const [buyDraft, setBuyDraft] = useState<BuyDraft | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [buying, setBuying] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [data, authState] = await Promise.all([
        apiGet<MarketListingDetail>(`/api/market/listings/${id}`),
        apiGet<AuthMe>('/api/auth/me').catch(() => null),
      ]);
      setListing(data);
      setMe(authState?.user ?? null);
      setComments(data.comments);
      const addressList = await apiGet<AddressSummary[]>('/api/addresses').catch(() => []);
      setAddresses(addressList);

      const states = await Promise.all(
        data.items.map(async (item) => {
          const state = await apiGet<{ collected: boolean; total: number }>(
            `/api/market/listings/${id}/items/${item.id}/collect`,
          ).catch(() => null);
          return [item.id, state] as const;
        }),
      );
      setCollectState(
        Object.fromEntries(
          states
            .filter((entry): entry is readonly [string, { collected: boolean; total: number }] =>
              Boolean(entry[1]),
            )
            .map(([itemId, state]) => [itemId, state]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '交易详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const requireLogin = (err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      router.push('/login');
      return true;
    }
    return false;
  };

  const toggleCollect = async (itemId: string) => {
    if (!id || actingItemId) return;
    setActingItemId(itemId);
    setMessage(null);
    try {
      const result = await apiPost<{ collected: boolean; total: number }>(
        `/api/market/listings/${id}/items/${itemId}/collect`,
      );
      setCollectState((current) => ({
        ...current,
        [itemId]: result,
      }));
    } catch (err) {
      if (!requireLogin(err)) setMessage(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActingItemId(null);
    }
  };

  const openBuy = (itemId: string) => {
    if (!listing) return;
    const defaultTradeMode =
      listing.tradeModes.find((mode) => mode !== 'external') ?? listing.tradeModes[0] ?? 'external';
    const defaultAddress = addresses.find((item) => item.isDefault) ?? addresses[0];
    setBuyDraft({
      itemId,
      quantity: '1',
      tradeMode: defaultTradeMode,
      addressId: defaultAddress?.id ?? '',
      shipName: defaultAddress?.name ?? '',
      shipPhone: defaultAddress?.phone ?? '',
      shipAddress: defaultAddress ? formatAddress(defaultAddress) : '',
    });
    setMessage(null);
  };

  const submitBuy = async () => {
    if (!id || !buyDraft || buying) return;
    if (buyDraft.tradeMode === 'external') {
      setMessage('该交易方式需要自行联系卖家，不能在线下单');
      return;
    }
    setBuying(true);
    setMessage(null);
    try {
      const result = await apiPost<{ orderId: string; orderNo: string; totalPrice: number }>(
        `/api/market/listings/${id}/items/${buyDraft.itemId}/buy`,
        {
          quantity: Math.max(1, Number(buyDraft.quantity) || 1),
          tradeMode: buyDraft.tradeMode,
          ...(buyDraft.addressId
            ? { addressId: buyDraft.addressId }
            : {
                shipName: buyDraft.shipName.trim(),
                shipPhone: buyDraft.shipPhone.trim(),
                shipAddress: buyDraft.shipAddress.trim(),
              }),
        },
      );
      setBuyDraft(null);
      router.push(`/order/${result.orderId}`);
    } catch (err) {
      if (!requireLogin(err)) setMessage(err instanceof Error ? err.message : '下单失败');
    } finally {
      setBuying(false);
    }
  };

  const submitComment = async () => {
    const text = commentText.trim();
    if (!id || !text || commenting) return;
    setCommenting(true);
    setMessage(null);
    try {
      const created = await apiPost<MarketListingDetail['comments'][number]>(
        `/api/market/listings/${id}/comments`,
        { content: text },
      );
      setComments((current) => [...current, created]);
      setListing((current) =>
        current ? { ...current, commentCount: current.commentCount + 1 } : current,
      );
      setCommentText('');
    } catch (err) {
      if (!requireLogin(err)) setMessage(err instanceof Error ? err.message : '评论失败');
    } finally {
      setCommenting(false);
    }
  };

  const updateStatus = async (status: 'on_sale' | 'off_shelf') => {
    if (!id || !listing) return;
    setMessage(null);
    try {
      const result = await apiPatch<{ status: string }>(`/api/market/listings/${id}/status`, { status });
      setListing((current) => current && { ...current, status: result.status });
      setMessage(status === 'off_shelf' ? '交易帖已下架' : '交易帖已上架');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '操作失败');
    }
  };

  if (loading) return <LoadingView label="正在加载交易详情..." />;
  if (!listing) return <ErrorView message={error ?? '交易帖不存在'} onRetry={load} />;
  const isSeller = Boolean(me?.id && listing.seller.id === me.id);

  const selectedItem = buyDraft
    ? listing.items.find((item) => item.id === buyDraft.itemId) ?? null
    : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <Stack.Screen options={{ title: '交易详情' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headerCard}>
          <Text style={styles.title}>{listing.title}</Text>
          <Pressable style={styles.sellerRow} onPress={() => router.push(`/user/${listing.seller.id}`)}>
            <Avatar uri={listing.seller.avatar} name={listing.seller.name} />
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.seller.name}</Text>
              <Text style={styles.meta}>
                Lv.{listing.seller.level ?? 1} · {listing.shipFrom}
              </Text>
            </View>
          </Pressable>
          {listing.description ? (
            <Text style={styles.description}>{stripHtml(listing.description)}</Text>
          ) : null}
          <View style={styles.chips}>
            {listing.taxons.map((item) => (
              <Text key={item.label} style={styles.chip}>
                {item.label}
              </Text>
            ))}
            {listing.tradeModes.map((mode) => (
              <Text key={mode} style={styles.chip}>
                {tradeModeLabel(mode)}
              </Text>
            ))}
          </View>
          <View style={styles.stats}>
            <Text style={styles.stat}>看 {listing.viewCount}</Text>
            <Text style={styles.stat}>评 {listing.commentCount}</Text>
            <Text style={styles.stat}>{listing.itemCount} 件商品</Text>
          </View>
          {isSeller ? (
            <View style={styles.sellerActions}>
              <Pressable onPress={() => router.push(`/market-edit/${listing.id}`)} style={styles.sellerActionButton}>
                <Text style={styles.sellerActionText}>编辑</Text>
              </Pressable>
              <Pressable
                onPress={() => updateStatus(listing.status === 'off_shelf' ? 'on_sale' : 'off_shelf')}
                style={styles.sellerDangerButton}
              >
                <Text style={styles.sellerDangerText}>
                  {listing.status === 'off_shelf' ? '上架' : '下架'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}

        {listing.items.map((item) => {
          const images = (item.images.length ? item.images : [item.cover])
            .map(absoluteAssetUrl)
            .filter((url): url is string => !!url);
          const collected = collectState[item.id]?.collected ?? false;
          return (
            <View key={item.id} style={styles.productCard}>
              {images[0] ? (
                <Pressable onPress={() => { setPreviewImages(images); setPreviewIndex(0); }}>
                  <Image source={{ uri: images[0] }} style={styles.productImage} />
                </Pressable>
              ) : (
                <View style={styles.productFallback} />
              )}
              <View style={styles.productBody}>
                <Text style={styles.productTitle}>{item.title}</Text>
                <Text style={styles.productDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.productMeta}>
                  <Text style={styles.price}>{formatPrice(item.price)}</Text>
                  <Text style={styles.meta}>
                    库存 {item.stock} · 已售 {item.soldCount}
                  </Text>
                </View>
                {images.length > 1 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.thumbRow}
                  >
                    {images.slice(1).map((image, index) => (
                      <Pressable
                        key={`${image}-${index}`}
                        onPress={() => {
                          setPreviewImages(images);
                          setPreviewIndex(index + 1);
                        }}
                      >
                        <Image source={{ uri: image }} style={styles.thumb} />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
                <View style={styles.productActions}>
                  <Pressable
                    onPress={() => toggleCollect(item.id)}
                    disabled={actingItemId !== null}
                    style={[styles.secondaryButton, collected && styles.secondaryButtonActive]}
                  >
                    <Text style={[styles.secondaryButtonText, collected && styles.secondaryButtonActiveText]}>
                      {actingItemId === item.id ? '...' : collected ? '已收藏' : '收藏'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openBuy(item.id)}
                    disabled={item.stock <= 0 || item.status !== 'on_sale'}
                    style={[styles.buyButton, (item.stock <= 0 || item.status !== 'on_sale') && styles.buttonDisabled]}
                  >
                    <Text style={styles.buyButtonText}>{item.stock > 0 ? '购买' : '售罄'}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}

        {selectedItem && buyDraft ? (
          <View style={styles.buyPanel}>
            <View style={styles.buyPanelHeader}>
              <View>
                <Text style={styles.buyPanelTitle}>{selectedItem.title}</Text>
                <Text style={styles.meta}>{formatPrice(selectedItem.price)} · 库存 {selectedItem.stock}</Text>
              </View>
              <Pressable onPress={() => setBuyDraft(null)} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.modeRow}>
              {listing.tradeModes.map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setBuyDraft((current) => current && { ...current, tradeMode: mode })}
                  style={[styles.modeChip, buyDraft.tradeMode === mode && styles.modeChipActive]}
                >
                  <Text style={[styles.modeText, buyDraft.tradeMode === mode && styles.modeTextActive]}>
                    {tradeModeLabel(mode)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>数量</Text>
              <TextInput
                value={buyDraft.quantity}
                onChangeText={(value) =>
                  setBuyDraft((current) => current && { ...current, quantity: value.replace(/[^\d]/g, '') })
                }
                keyboardType="number-pad"
                style={styles.formInput}
              />
            </View>
            {addresses.length ? (
              <View style={styles.addressPicker}>
                <View style={styles.buyPanelHeader}>
                  <Text style={styles.formLabel}>收货地址</Text>
                  <Pressable
                    onPress={() =>
                      setBuyDraft((current) =>
                        current && {
                          ...current,
                          addressId: '',
                          shipName: '',
                          shipPhone: '',
                          shipAddress: '',
                        },
                      )
                    }
                  >
                    <Text style={styles.linkText}>手填</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.addressList}
                >
                  {addresses.map((address) => {
                    const active = buyDraft.addressId === address.id;
                    return (
                      <Pressable
                        key={address.id}
                        onPress={() =>
                          setBuyDraft((current) =>
                            current && {
                              ...current,
                              addressId: address.id,
                              shipName: address.name,
                              shipPhone: address.phone,
                              shipAddress: formatAddress(address),
                            },
                          )
                        }
                        style={[styles.addressChip, active && styles.addressChipActive]}
                      >
                        <Text style={[styles.addressName, active && styles.addressNameActive]} numberOfLines={1}>
                          {address.name} {address.phone}
                        </Text>
                        <Text style={styles.addressLine} numberOfLines={2}>
                          {formatAddress(address)}
                        </Text>
                        {address.isDefault ? <Text style={styles.addressDefault}>默认</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
            <TextInput
              value={buyDraft.shipName}
              onChangeText={(value) => setBuyDraft((current) => current && { ...current, shipName: value })}
              placeholder="收货人"
              placeholderTextColor={colors.muted}
              editable={!buyDraft.addressId}
              style={styles.formInput}
            />
            <TextInput
              value={buyDraft.shipPhone}
              onChangeText={(value) => setBuyDraft((current) => current && { ...current, shipPhone: value })}
              placeholder="手机号"
              placeholderTextColor={colors.muted}
              keyboardType="phone-pad"
              editable={!buyDraft.addressId}
              style={styles.formInput}
            />
            <TextInput
              value={buyDraft.shipAddress}
              onChangeText={(value) => setBuyDraft((current) => current && { ...current, shipAddress: value })}
              placeholder="收货地址"
              placeholderTextColor={colors.muted}
              multiline
              editable={!buyDraft.addressId}
              style={[styles.formInput, styles.addressInput]}
            />
            <Pressable onPress={submitBuy} disabled={buying} style={[styles.submitBuyButton, buying && styles.buttonDisabled]}>
              {buying ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBuyText}>确认下单</Text>}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>评论</Text>
          <Text style={styles.meta}>{comments.length} 条</Text>
        </View>
        {comments.length ? (
          comments.map((comment) => (
            <View key={comment.id} style={styles.commentCard}>
              <Avatar uri={comment.author.avatar} name={comment.author.name} small />
              <View style={styles.commentBody}>
                <Text style={styles.commentAuthor}>{comment.author.name}</Text>
                <Text style={styles.commentText}>{stripHtml(comment.content) || '图片评论'}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.meta}>还没有评论</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="问问卖家..."
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          style={styles.commentInput}
        />
        <Pressable
          onPress={submitComment}
          disabled={!commentText.trim() || commenting}
          style={[styles.sendButton, (!commentText.trim() || commenting) && styles.buttonDisabled]}
        >
          {commenting ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>发</Text>}
        </Pressable>
      </View>
      <ImagePreview
        images={previewImages}
        visible={previewIndex !== null}
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
      />
    </KeyboardAvoidingView>
  );
}

function tradeModeLabel(mode: TradeMode) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  return '自行联系';
}

function formatAddress(address: AddressSummary) {
  return [address.province, address.city, address.district, address.detail].filter(Boolean).join(' ');
}

function Avatar({ uri, name, small }: { uri?: string | null; name: string; small?: boolean }) {
  const source = absoluteAssetUrl(uri);
  const size = small ? 32 : 40;
  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.avatar, { height: size, width: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View style={[styles.avatarFallback, { height: size, width: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarText}>{name.slice(0, 1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 96,
  },
  headerCard: {
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    backgroundColor: colors.leafSoft,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.leafSoft,
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 15,
    fontWeight: '800',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  description: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sellerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sellerActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.leafSoft,
    paddingVertical: spacing.sm,
  },
  sellerActionText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  sellerDangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    paddingVertical: spacing.sm,
  },
  sellerDangerText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '900',
  },
  stat: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  inlineMessage: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '700',
  },
  productCard: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  productImage: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  productFallback: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: colors.leafSoft,
  },
  productBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  productTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  productDesc: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  price: {
    color: '#dc2626',
    fontSize: 19,
    fontWeight: '900',
  },
  thumbRow: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  thumb: {
    height: 58,
    width: 58,
    borderRadius: 10,
    backgroundColor: colors.leafSoft,
  },
  productActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.leafSoft,
    paddingVertical: spacing.sm,
  },
  secondaryButtonActive: {
    backgroundColor: '#fee2e2',
  },
  secondaryButtonText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryButtonActiveText: {
    color: '#dc2626',
  },
  buyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.leaf,
    paddingVertical: spacing.sm,
  },
  buyButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  buyPanel: {
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  buyPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  buyPanelTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    width: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
  },
  closeText: {
    color: colors.muted,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  modeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  modeTextActive: {
    color: colors.leaf,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  formLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  formInput: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  addressPicker: {
    gap: spacing.sm,
  },
  addressList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  addressChip: {
    width: 220,
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  addressChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  addressName: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  addressNameActive: {
    color: colors.leaf,
  },
  addressLine: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  addressDefault: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.surface,
    color: colors.leaf,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  linkText: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  addressInput: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  submitBuyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.leaf,
  },
  submitBuyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  commentCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  commentBody: {
    flex: 1,
    gap: spacing.xs,
  },
  commentAuthor: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  commentText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  empty: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  actionBar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  commentInput: {
    flex: 1,
    maxHeight: 86,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    width: 42,
    borderRadius: 21,
    backgroundColor: colors.leaf,
  },
  sendText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
