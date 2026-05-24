import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../lib/theme';

export function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
});
