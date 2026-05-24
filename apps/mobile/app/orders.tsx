import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import { absoluteAssetUrl, apiGet, type OrderSummary } from '../lib/api';
import { formatPrice } from '../lib/format';
import { colors, spacing } from '../lib/theme';

type Role = 'buyer' | 'seller';

const roles: { key: Role; label: string }[] = [
  { key: 'buyer', label: '我买到的' },
  { key: 'seller', label: '我卖出的' },
];

export default function OrdersScreen() {
  const router = useRouter();
  const [role, setRole] = useState<Role>('buyer');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextRole = role, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<OrderSummary[]>(`/api/orders?role=${nextRole}`);
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '订单加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    void load(role);
  }, [load, role]);

  const switchRole = (nextRole: Role) => {
    setRole(nextRole);
  };

  if (loading && orders.length === 0) return <LoadingView label="正在加载订单..." />;
  if (error && orders.length === 0) return <ErrorView message={error} onRetry={() => load(role)} />;

  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(role, true)}
          tintColor={colors.leaf}
          colors={[colors.leaf]}
        />
      }
      ListHeaderComponent={
        <View style={styles.segmented}>
          {roles.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => switchRole(item.key)}
              style={[styles.segment, role === item.key && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, role === item.key && styles.segmentTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>暂无订单</Text>
        </View>
      }
      renderItem={({ item }) => (
        <OrderCard
          order={item}
          role={role}
          onPress={() => router.push(`/order/${item.id}`)}
        />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

function OrderCard({ order, role, onPress }: { order: OrderSummary; role: Role; onPress: () => void }) {
  const title = order.listingItem?.title || order.product?.title || order.auctionTitle || order.listing?.title || '订单商品';
  const cover = absoluteAssetUrl(order.listingItem?.cover || order.product?.cover || order.auctionCover || order.listing?.cover);
  const peer = role === 'buyer' ? order.seller?.name : order.buyer.name;
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {cover ? <Image source={{ uri: cover }} style={styles.cover} /> : <View style={styles.coverFallback} />}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text numberOfLines={1} style={styles.status}>{statusLabel(order.status)}</Text>
          <Text numberOfLines={1} style={styles.orderNo}>{order.orderNo}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
        <Text style={styles.meta}>
          {peer ? `${role === 'buyer' ? '卖家' : '买家'} ${peer} · ` : ''}数量 {order.quantity}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.price}>{formatPrice(order.totalPrice)}</Text>
          <Text style={styles.meta}>{new Date(order.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.md,
  },
  segmented: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    borderRadius: 14,
    backgroundColor: '#eaf1e7',
    padding: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 11,
    paddingVertical: 9,
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: colors.leaf,
  },
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cover: {
    height: 116,
    width: 116,
    backgroundColor: colors.leafSoft,
  },
  coverFallback: {
    height: 116,
    width: 116,
    backgroundColor: colors.leafSoft,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  orderNo: {
    color: colors.muted,
    fontSize: 11,
    maxWidth: 120,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    gap: spacing.sm,
  },
  price: {
    color: '#dc2626',
    fontSize: 17,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
});
