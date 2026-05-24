import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  absoluteAssetUrl,
  apiGet,
  apiPost,
  type AuthMe,
  type OrderSummary,
  type PaymentSummary,
} from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

type PayChannel = 'alipay' | 'wechat';

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [me, setMe] = useState<AuthMe['user'] | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [payChannel, setPayChannel] = useState<PayChannel>('alipay');
  const [trackingNo, setTrackingNo] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [orderData, meData] = await Promise.all([
        apiGet<OrderSummary>(`/api/orders/${id}`),
        apiGet<AuthMe>('/api/auth/me'),
      ]);
      setOrder(orderData);
      setMe(meData.user);
      setTrackingNo(orderData.trackingNo ?? '');
      setReviewText(orderData.reviewTextPlain ?? '');
      setReviewRating(orderData.reviewRating ?? 5);
      setPayment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单详情加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const role = useMemo(() => {
    if (!order || !me) return 'buyer' as const;
    return order.seller?.id === me.id ? 'seller' : 'buyer';
  }, [me, order]);

  const callAction = async (action: string, task: () => Promise<unknown>, success: string) => {
    if (acting) return;
    setActing(action);
    setMessage(null);
    try {
      await task();
      setMessage(success);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '操作失败');
    } finally {
      setActing(null);
    }
  };

  const createPayment = async () => {
    if (!order) return;
    if (acting) return;
    setActing('pay');
    setMessage(null);
    try {
      const data = await apiPost<PaymentSummary>('/api/payments', {
        bizType: order.source === 'auction' ? 'auction_balance' : 'order',
        bizId: order.id,
        channel: payChannel,
      });
      setPayment(data);
      router.push(`/payment/${data.payNo}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '生成支付单失败');
    } finally {
      setActing(null);
    }
  };

  const confirmPayment = async () => {
    if (!payment) return;
    await callAction(
      'confirmPay',
      () => apiPost(`/api/payments/${payment.payNo}/confirm`),
      '支付已确认',
    );
  };

  if (loading) return <LoadingView label="正在加载订单详情..." />;
  if (!order) return <ErrorView message={error ?? '订单不存在'} onRetry={load} />;

  const title =
    order.listingItem?.title ||
    order.product?.title ||
    order.auctionTitle ||
    order.listing?.title ||
    '订单商品';
  const cover = absoluteAssetUrl(
    order.listingItem?.cover || order.product?.cover || order.auctionCover || order.listing?.cover,
  );
  const sellerName = order.seller?.name ?? '平台';
  const canPay = role === 'buyer' && order.status === 'pending_payment';
  const canCancel = role === 'buyer' && order.status === 'pending_payment';
  const canShip = role === 'seller' && order.status === 'pending_ship';
  const canReceive = role === 'buyer' && order.status === 'pending_receipt';
  const canReview = role === 'buyer' && order.status === 'pending_review';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <Stack.Screen options={{ title: '订单详情' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{statusLabel(order.status)}</Text>
          <Text style={styles.statusDesc}>{statusDesc(order.status, role)}</Text>
          <Text style={styles.orderNo}>订单号 {order.orderNo}</Text>
        </View>

        {message ? <Text style={styles.inlineMessage}>{message}</Text> : null}

        <Pressable
          style={styles.productCard}
          onPress={() => {
            const listingId = order.listing?.id ?? order.listingItem?.listingId;
            if (listingId) router.push(`/market/${listingId}`);
          }}
        >
          {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
          <View style={styles.productBody}>
            <Text numberOfLines={2} style={styles.productTitle}>{title}</Text>
            <Text style={styles.meta}>数量 {order.quantity} · 单价 {formatPrice(order.unitPrice)}</Text>
            <Text style={styles.price}>{formatPrice(order.totalPrice)}</Text>
          </View>
        </Pressable>

        <InfoCard title="金额">
          <InfoRow label="商品金额" value={formatPrice(order.unitPrice * order.quantity)} />
          {order.platformFee ? <InfoRow label="手续费" value={formatPrice(order.platformFee)} /> : null}
          {order.depositPaid ? <InfoRow label="保证金抵扣" value={`-${formatPrice(order.depositPaid)}`} /> : null}
          {order.pointsBackTotal ? <InfoRow label="返积分" value={`${order.pointsBackTotal}`} /> : null}
          <InfoRow label="应付合计" value={formatPrice(order.totalPrice)} strong />
        </InfoCard>

        <InfoCard title="交易信息">
          <InfoRow label="交易方式" value={tradeModeLabel(order.tradeMode)} />
          <InfoRow label="买家" value={order.buyer.name} />
          <InfoRow label="卖家" value={sellerName} />
          <InfoRow label="创建时间" value={formatDateTime(order.createdAt)} />
        </InfoCard>

        <InfoCard title="收货与物流">
          <InfoRow label="收件人" value={order.shipName || '未填写'} />
          <InfoRow label="联系电话" value={order.shipPhone || '未填写'} />
          <InfoRow label="收货地址" value={order.shipAddress || '未填写'} />
          <InfoRow label="物流单号" value={order.trackingNo || '暂无'} />
          {order.shippedAt ? <InfoRow label="发货时间" value={formatDateTime(order.shippedAt)} /> : null}
          {order.receivedAt ? <InfoRow label="收货时间" value={formatDateTime(order.receivedAt)} /> : null}
        </InfoCard>

        {canPay ? (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>付款</Text>
            <View style={styles.channelRow}>
              {(['alipay', 'wechat'] as PayChannel[]).map((channel) => (
                <Pressable
                  key={channel}
                  onPress={() => setPayChannel(channel)}
                  style={[styles.channelChip, payChannel === channel && styles.channelChipActive]}
                >
                  <Text style={[styles.channelText, payChannel === channel && styles.channelTextActive]}>
                    {channel === 'alipay' ? '支付宝' : '微信'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              disabled={acting !== null}
              onPress={createPayment}
              style={[styles.primaryButton, acting && styles.disabled]}
            >
              {acting === 'pay' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>生成支付单</Text>}
            </Pressable>
            {payment ? (
              <View style={styles.paymentBox}>
                <Text style={styles.paymentNo}>{payment.payNo}</Text>
                <Text style={styles.meta}>金额 {formatPrice(payment.amount)} · {paymentStatusLabel(payment.status)}</Text>
                {payment.qrcode ? <Text style={styles.qrText} numberOfLines={3}>{payment.qrcode}</Text> : null}
                {payment.status === 'pending' ? (
                  <Pressable
                    disabled={acting !== null}
                    onPress={confirmPayment}
                    style={[styles.secondaryButton, acting && styles.disabled]}
                  >
                    <Text style={styles.secondaryText}>
                      {acting === 'confirmPay' ? '确认中...' : '模拟支付完成'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {canShip ? (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>发货</Text>
            <TextInput
              value={trackingNo}
              onChangeText={setTrackingNo}
              placeholder="填写物流单号"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable
              disabled={acting !== null || !trackingNo.trim()}
              onPress={() =>
                callAction(
                  'ship',
                  () => apiPost(`/api/orders/${order.id}/ship`, { trackingNo: trackingNo.trim() }),
                  '已发货',
                )
              }
              style={[styles.primaryButton, (acting !== null || !trackingNo.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>{acting === 'ship' ? '提交中...' : '确认发货'}</Text>
            </Pressable>
          </View>
        ) : null}

        {canReview ? (
          <View style={styles.actionCard}>
            <Text style={styles.sectionTitle}>评价</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <Pressable
                  key={score}
                  onPress={() => setReviewRating(score)}
                  style={[styles.ratingDot, reviewRating >= score && styles.ratingDotActive]}
                >
                  <Text style={[styles.ratingText, reviewRating >= score && styles.ratingTextActive]}>{score}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={reviewText}
              onChangeText={setReviewText}
              placeholder="写下这次交易体验"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.reviewInput]}
            />
            <Pressable
              disabled={acting !== null || !reviewText.trim()}
              onPress={() =>
                callAction(
                  'review',
                  () => apiPost(`/api/orders/${order.id}/review`, { rating: reviewRating, text: reviewText.trim() }),
                  '评价已提交',
                )
              }
              style={[styles.primaryButton, (acting !== null || !reviewText.trim()) && styles.disabled]}
            >
              <Text style={styles.primaryText}>{acting === 'review' ? '提交中...' : '提交评价'}</Text>
            </Pressable>
          </View>
        ) : null}

        {order.reviewTextPlain ? (
          <InfoCard title="我的评价">
            <InfoRow label="评分" value={`${order.reviewRating ?? 5}/5`} />
            <Text style={styles.reviewText}>{order.reviewTextPlain}</Text>
          </InfoCard>
        ) : null}
      </ScrollView>

      {(canCancel || canReceive) ? (
        <View style={styles.footer}>
          {canCancel ? (
            <Pressable
              disabled={acting !== null}
              onPress={() =>
                callAction(
                  'cancel',
                  () => apiPost(`/api/orders/${order.id}/cancel`),
                  '订单已取消',
                )
              }
              style={[styles.outlineButton, acting && styles.disabled]}
            >
              <Text style={styles.outlineText}>{acting === 'cancel' ? '取消中...' : '取消订单'}</Text>
            </Pressable>
          ) : null}
          {canReceive ? (
            <Pressable
              disabled={acting !== null}
              onPress={() =>
                callAction(
                  'receive',
                  () => apiPost(`/api/orders/${order.id}/receive`),
                  '已确认收货',
                )
              }
              style={[styles.primaryButton, styles.footerPrimary, acting && styles.disabled]}
            >
              <Text style={styles.primaryText}>{acting === 'receive' ? '提交中...' : '确认收货'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.infoRows}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]}>{value}</Text>
    </View>
  );
}

function statusLabel(status: OrderSummary['status']) {
  if (status === 'pending_payment') return '待付款';
  if (status === 'pending_ship') return '待发货';
  if (status === 'pending_receipt') return '待收货';
  if (status === 'pending_review') return '待评价';
  if (status === 'completed') return '已完成';
  if (status === 'cancelled') return '已取消';
  return '已退款';
}

function statusDesc(status: OrderSummary['status'], role: 'buyer' | 'seller') {
  if (status === 'pending_payment') return role === 'buyer' ? '请完成支付，卖家随后发货。' : '等待买家付款。';
  if (status === 'pending_ship') return role === 'seller' ? '买家已付款，请尽快发货。' : '卖家正在准备发货。';
  if (status === 'pending_receipt') return role === 'buyer' ? '商品已发出，收到后确认收货。' : '等待买家确认收货。';
  if (status === 'pending_review') return role === 'buyer' ? '交易完成后可以评价。' : '买家已确认收货。';
  if (status === 'completed') return '这笔订单已完成。';
  if (status === 'cancelled') return '这笔订单已取消。';
  return '这笔订单已退款。';
}

function tradeModeLabel(mode?: OrderSummary['tradeMode']) {
  if (mode === 'platform_escrow') return '平台担保';
  if (mode === 'online_payment') return '在线支付';
  if (mode === 'external') return '自行联系';
  return '未记录';
}

function paymentStatusLabel(status: PaymentSummary['status']) {
  if (status === 'pending') return '待支付';
  if (status === 'paid') return '已支付';
  if (status === 'expired') return '已过期';
  if (status === 'cancelled') return '已取消';
  return '已退款';
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 116,
  },
  statusCard: {
    gap: spacing.xs,
    borderRadius: 20,
    backgroundColor: colors.leaf,
    padding: spacing.lg,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  statusDesc: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 14,
    lineHeight: 21,
  },
  orderNo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
  },
  inlineMessage: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  productCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    height: 118,
    width: 118,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    height: 118,
    width: 118,
    backgroundColor: colors.leafSoft,
  },
  productBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  productTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    marginTop: 'auto',
    color: '#dc2626',
    fontSize: 19,
    fontWeight: '900',
  },
  infoCard: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  actionCard: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  infoRows: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  infoValue: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  infoValueStrong: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '900',
  },
  channelRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  channelChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: spacing.sm,
  },
  channelChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  channelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '900',
  },
  channelTextActive: {
    color: colors.leaf,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  reviewInput: {
    minHeight: 96,
    lineHeight: 22,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.md,
  },
  secondaryText: {
    color: colors.leaf,
    fontSize: 14,
    fontWeight: '900',
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  outlineText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  paymentBox: {
    gap: spacing.xs,
    borderRadius: 14,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  paymentNo: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  qrText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingDot: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 34,
    width: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  ratingDotActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leaf,
  },
  ratingText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  ratingTextActive: {
    color: '#fff',
  },
  reviewText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  footerPrimary: {
    flex: 1,
  },
  disabled: {
    opacity: 0.45,
  },
});
