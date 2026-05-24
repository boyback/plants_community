import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  type AuctionDetail,
  type PaymentSummary,
} from '../../lib/api';
import { formatPrice, stripHtml } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

type JoinChannel = 'alipay' | 'wechat' | 'points';

export default function AuctionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bidYuan, setBidYuan] = useState('');
  const [joinChannel, setJoinChannel] = useState<JoinChannel>('alipay');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AuctionDetail>(`/api/auctions/${id}`);
      setAuction(data);
      const next = data.bidCount === 0 ? data.startPrice : data.currentPrice + data.minIncrement;
      setBidYuan((current) => current || (next / 100).toFixed(2));
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : '拍卖详情加载失败');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(true), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const minNext = useMemo(() => {
    if (!auction) return 0;
    return auction.bidCount === 0 ? auction.startPrice : auction.currentPrice + auction.minIncrement;
  }, [auction]);

  const join = async () => {
    if (!auction || acting) return;
    setActing('join');
    setMessage(null);
    try {
      const result = await apiPost<{
        alreadyParticipated?: boolean;
        joined?: boolean;
        channel?: string;
        payment?: PaymentSummary;
      }>(`/api/auctions/${auction.id}/join`, { channel: joinChannel });
      if (result.payment) {
        router.push(`/payment/${result.payment.payNo}`);
        return;
      }
      setMessage(result.alreadyParticipated ? '已具备出价资格' : '保证金已完成，可以出价');
      await load(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '参与拍卖失败');
    } finally {
      setActing(null);
    }
  };

  const bid = async (buyNow = false) => {
    if (!auction || acting) return;
    const amount = buyNow && auction.buyNowPrice
      ? auction.buyNowPrice
      : Math.round(Number(bidYuan) * 100);
    if (!buyNow && (!Number.isFinite(amount) || amount < minNext)) {
      setMessage(`出价至少 ${formatPrice(minNext)}`);
      return;
    }
    setActing(buyNow ? 'buyNow' : 'bid');
    setMessage(null);
    try {
      const result = await apiPost<{ currentPrice: number; bidCount: number; endAt: string; extended?: boolean }>(
        `/api/auctions/${auction.id}/bid`,
        { amount, buyNow },
      );
      setMessage(result.extended ? '出价成功，拍卖已延时' : '出价成功');
      await load(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '出价失败');
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingView label="正在加载拍卖详情..." />;
  if (!auction) return <ErrorView message={error ?? '拍卖不存在'} onRetry={() => load()} />;

  const cover = absoluteAssetUrl(auction.cover);
  const canBid = auction.status === 'live';
  const hasDeposit = auction.myParticipant?.depositStatus === 'held';
  const desc = auction.descriptionText || stripHtml(auction.description);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ title: '拍卖详情' }} />
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}

      <View style={styles.headerCard}>
        <View style={styles.statusRow}>
          <Text style={styles.status}>{auctionStatusLabel(auction.status)}</Text>
          <Text style={styles.meta}>{formatRemain(auction.endAt, auction.status)}</Text>
        </View>
        <Text style={styles.title}>{auction.title}</Text>
        <Text style={styles.seller}>卖家 {auction.seller.name}</Text>
        {desc ? <Text style={styles.desc}>{desc}</Text> : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.priceCard}>
        <InfoRow label={auction.bidCount > 0 ? '当前价' : '起拍价'} value={formatPrice(auction.currentPrice)} strong />
        <InfoRow label="加价幅度" value={formatPrice(auction.minIncrement)} />
        <InfoRow label="保证金" value={formatPrice(auction.depositAmount)} />
        <InfoRow label="出价次数" value={`${auction.bidCount}`} />
        {auction.buyNowPrice ? <InfoRow label="一口价" value={formatPrice(auction.buyNowPrice)} /> : null}
        {auction.winningOrderId ? (
          <Pressable style={styles.primaryButton} onPress={() => router.push(`/order/${auction.winningOrderId}`)}>
            <Text style={styles.primaryText}>查看尾款订单</Text>
          </Pressable>
        ) : null}
      </View>

      {canBid && !hasDeposit ? (
        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>参与拍卖</Text>
          <Text style={styles.meta}>先支付保证金，成功后才能出价。</Text>
          <View style={styles.channelRow}>
            {(['alipay', 'wechat', 'points'] as JoinChannel[]).map((channel) => (
              <Pressable
                key={channel}
                onPress={() => setJoinChannel(channel)}
                style={[styles.channelChip, joinChannel === channel && styles.channelChipActive]}
              >
                <Text style={[styles.channelText, joinChannel === channel && styles.channelTextActive]}>
                  {channelLabel(channel)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={acting !== null}
            onPress={join}
            style={[styles.primaryButton, acting && styles.disabled]}
          >
            {acting === 'join' ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>支付保证金</Text>}
          </Pressable>
        </View>
      ) : null}

      {canBid && hasDeposit ? (
        <View style={styles.actionCard}>
          <Text style={styles.sectionTitle}>出价</Text>
          <Text style={styles.meta}>最低出价 {formatPrice(minNext)}</Text>
          <TextInput
            value={bidYuan}
            onChangeText={setBidYuan}
            keyboardType="decimal-pad"
            placeholder="出价金额"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <View style={styles.bidActions}>
            <Pressable
              disabled={acting !== null}
              onPress={() => bid(false)}
              style={[styles.primaryButton, styles.bidButton, acting && styles.disabled]}
            >
              <Text style={styles.primaryText}>{acting === 'bid' ? '提交中...' : '确认出价'}</Text>
            </Pressable>
            {auction.buyNowPrice ? (
              <Pressable
                disabled={acting !== null}
                onPress={() => bid(true)}
                style={[styles.buyNowButton, acting && styles.disabled]}
              >
                <Text style={styles.buyNowText}>{acting === 'buyNow' ? '提交中...' : '一口价'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.logCard}>
        <Text style={styles.sectionTitle}>出价记录</Text>
        {auction.bids.length ? (
          auction.bids.slice(0, 30).map((item, index) => (
            <View key={item.id} style={styles.bidRow}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={styles.bidBody}>
                <Text style={styles.bidder}>{item.bidder.name}</Text>
                <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
              </View>
              <Text style={styles.bidPrice}>{formatPrice(item.amount)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.meta}>暂无出价</Text>
        )}
      </View>
    </ScrollView>
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

function auctionStatusLabel(status: AuctionDetail['status']) {
  if (status === 'live') return '进行中';
  if (status === 'scheduled') return '预展';
  if (status === 'finished') return '已结束';
  if (status === 'cancelled') return '已取消';
  return '草稿';
}

function channelLabel(channel: JoinChannel) {
  if (channel === 'alipay') return '支付宝';
  if (channel === 'wechat') return '微信';
  return '积分';
}

function formatRemain(endAt: string, status: AuctionDetail['status']) {
  if (status === 'scheduled') return `开始 ${new Date(endAt).toLocaleDateString()}`;
  if (status !== 'live') return new Date(endAt).toLocaleDateString();
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return '即将结束';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `剩 ${hours}小时${minutes}分` : `剩 ${minutes}分`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
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
  cover: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    aspectRatio: 1,
    width: '100%',
    borderRadius: 20,
    backgroundColor: colors.leafSoft,
  },
  headerCard: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  status: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
  },
  seller: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  desc: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  priceCard: {
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
  logCard: {
    gap: spacing.sm,
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
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  infoValueStrong: {
    color: '#dc2626',
    fontSize: 22,
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
    fontSize: 13,
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
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  bidActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
  },
  bidButton: {
    flex: 1,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  buyNowButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    paddingHorizontal: spacing.md,
  },
  buyNowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  bidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  rank: {
    width: 24,
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '900',
  },
  bidBody: {
    flex: 1,
  },
  bidder: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  bidPrice: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
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
