import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { apiGet, apiPost, type PaymentSummary } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

export default function PaymentScreen() {
  const router = useRouter();
  const { payNo } = useLocalSearchParams<{ payNo: string }>();
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!payNo) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PaymentSummary & { scanning?: boolean }>(`/api/payments/${payNo}`);
      setPayment(data);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : '支付单加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [payNo]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!payment || payment.status !== 'pending') return;
    timerRef.current = setInterval(() => {
      void load(true);
    }, 3000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [load, payment?.status]);

  const confirm = async () => {
    if (!payment || confirming) return;
    setConfirming(true);
    setMessage(null);
    try {
      await apiPost(`/api/payments/${payment.payNo}/confirm`);
      setMessage('支付已确认');
      await load(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '确认支付失败');
    } finally {
      setConfirming(false);
    }
  };

  const goBusiness = () => {
    if (!payment) return;
    if (payment.bizType === 'order' || payment.bizType === 'auction_balance') {
      router.replace(`/order/${payment.bizId}`);
      return;
    }
    router.replace('/(tabs)/profile');
  };

  if (loading) return <LoadingView label="正在加载支付单..." />;
  if (!payment) return <ErrorView message={error ?? '支付单不存在'} onRetry={() => load()} />;

  const pending = payment.status === 'pending';
  const paid = payment.status === 'paid';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: '支付' }} />
      <View style={[styles.statusCard, paid && styles.statusCardPaid]}>
        <Text style={styles.status}>{paymentStatusLabel(payment.status)}</Text>
        <Text style={styles.amount}>{formatPrice(payment.amount)}</Text>
        <Text style={styles.meta}>{payment.payNo}</Text>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>支付方式</Text>
        <InfoRow label="渠道" value={channelLabel(payment.channel)} />
        <InfoRow label="业务类型" value={bizTypeLabel(payment.bizType)} />
        <InfoRow label="过期时间" value={formatDateTime(payment.expireAt)} />
        {payment.paidAt ? <InfoRow label="支付时间" value={formatDateTime(payment.paidAt)} /> : null}
      </View>

      {pending ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>扫码信息</Text>
          <View style={styles.qrBox}>
            <Text style={styles.qrText}>{payment.qrcode || payment.payNo}</Text>
          </View>
          <Text style={styles.hint}>页面会每 3 秒刷新一次支付状态。</Text>
          {payment.qrcode?.startsWith('mock://') ? (
            <Pressable
              disabled={confirming}
              onPress={confirm}
              style={[styles.primaryButton, confirming && styles.disabled]}
            >
              {confirming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>模拟支付完成</Text>}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable onPress={goBusiness} style={paid ? styles.primaryButton : styles.secondaryButton}>
        <Text style={paid ? styles.primaryText : styles.secondaryText}>
          {paid ? '返回订单' : '查看订单'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function paymentStatusLabel(status: PaymentSummary['status']) {
  if (status === 'pending') return '待支付';
  if (status === 'paid') return '已支付';
  if (status === 'expired') return '已过期';
  if (status === 'cancelled') return '已取消';
  return '已退款';
}

function channelLabel(channel: PaymentSummary['channel']) {
  if (channel === 'alipay') return '支付宝';
  if (channel === 'wechat') return '微信';
  return '钻石';
}

function bizTypeLabel(type: PaymentSummary['bizType']) {
  if (type === 'order') return '商品订单';
  if (type === 'auction_balance') return '拍卖尾款';
  if (type === 'deposit') return '拍卖保证金';
  return '会员订单';
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
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statusCard: {
    gap: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#b45309',
    padding: spacing.lg,
  },
  statusCardPaid: {
    backgroundColor: colors.leaf,
  },
  status: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  amount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  meta: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
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
  qrBox: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  qrText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.leaf,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.leafSoft,
  },
  secondaryText: {
    color: colors.leaf,
    fontSize: 15,
    fontWeight: '900',
  },
  message: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  disabled: {
    opacity: 0.45,
  },
});
