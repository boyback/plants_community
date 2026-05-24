import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../lib/theme';

export function LoadingView({ label = '加载中...' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.leaf} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.state}>
      <Text style={styles.title}>加载失败</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>重试</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyView({
  title = '暂无内容',
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyMark}>—</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyMark: {
    color: colors.leaf,
    fontSize: 24,
    fontWeight: '900',
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  muted: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
