import { Tabs, usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing } from '../../lib/theme';

const tabs = [
  { key: 'index', label: '首页', href: '/(tabs)', icon: 'home' },
  { key: 'boards', label: '图鉴', href: '/(tabs)/boards', icon: 'grid' },
  { key: 'compose', label: '发布', href: '/compose', icon: 'scan' },
  { key: 'market', label: '交易', href: '/(tabs)/market', icon: 'shop' },
  { key: 'profile', label: '我的', href: '/(tabs)/profile', icon: 'person' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      // tabBar={() => <PlantumTabBar />}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontSize: 17, fontWeight: '800' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen
        name="boards"
        options={{
          title: '图鉴',
          tabBarStyle: { display: 'none' }
        }}
      />
      <Tabs.Screen name="market" options={{ title: '交易' }} />
      <Tabs.Screen name="profile" options={{ title: '我的' }} />
    </Tabs>
  );
}

/*
function PlantumTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View pointerEvents="box-none" style={styles.wrap}>
      <View style={styles.bar}>
        {tabs.map((item) => {
          const active =
            item.key === 'index'
              ? pathname === '/' || pathname === '/(tabs)' || pathname.endsWith('/(tabs)')
              : pathname.includes(item.key);
          const isCenter = item.key === 'compose';
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => router.push(item.href)}
              style={[styles.item, isCenter && styles.centerSlot]}
            >
              <View style={[styles.iconShell, active && styles.iconShellActive, isCenter && styles.centerButton]}>
                <LineIcon name={item.icon} active={active || isCenter} center={isCenter} />
              </View>
              {!isCenter ? (
                <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
*/

function LineIcon({
  name,
  active,
  center,
}: {
  name: (typeof tabs)[number]['icon'];
  active: boolean;
  center?: boolean;
}) {
  const color = center ? '#ffffff' : active ? colors.leafDeep : colors.muted;
  if (name === 'grid') {
    return (
      <View style={styles.gridIcon}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={[styles.gridDot, { borderColor: color }]} />
        ))}
      </View>
    );
  }
  if (name === 'scan') {
    return (
      <View style={styles.scanIcon}>
        <View style={[styles.scanCorner, styles.scanTopLeft]} />
        <View style={[styles.scanCorner, styles.scanTopRight]} />
        <View style={[styles.scanCorner, styles.scanBottomLeft]} />
        <View style={[styles.scanCorner, styles.scanBottomRight]} />
      </View>
    );
  }
  if (name === 'shop') {
    return (
      <View style={[styles.bagIcon, { borderColor: color }]}>
        <View style={[styles.bagHandle, { borderColor: color }]} />
      </View>
    );
  }
  if (name === 'person') {
    return (
      <View style={styles.personIcon}>
        <View style={[styles.personHead, { borderColor: color }]} />
        <View style={[styles.personBody, { borderColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.homeIcon}>
      <View style={[styles.homeRoof, { borderBottomColor: color }]} />
      <View style={[styles.homeBody, { borderColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 0,
    bottom: 18,
    left: 0,
    alignItems: 'center',
  },
  bar: {
    ...shadows.floating,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '92%',
    minHeight: 70,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    minWidth: 50,
    gap: 3,
  },
  centerSlot: {
    width: 72,
  },
  iconShell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    width: 30,
    borderRadius: 4,
  },
  iconShellActive: {
    backgroundColor: colors.leafSoft,
  },
  centerButton: {
    ...shadows.floating,
    height: 62,
    width: 62,
    borderRadius: 31,
    borderWidth: 5,
    borderColor: '#d8e8c3',
    backgroundColor: colors.leaf,
    transform: [{ translateY: -17 }],
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  labelActive: {
    color: colors.leafDeep,
  },
  homeIcon: {
    alignItems: 'center',
    height: 23,
    width: 23,
  },
  homeRoof: {
    width: 0,
    height: 0,
    borderRightWidth: 9,
    borderBottomWidth: 8,
    borderLeftWidth: 9,
    borderRightColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  homeBody: {
    height: 12,
    width: 16,
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  gridIcon: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    height: 21,
    width: 21,
  },
  gridDot: {
    height: 9,
    width: 9,
    borderRadius: 3,
    borderWidth: 2,
  },
  scanIcon: {
    height: 28,
    width: 28,
  },
  scanCorner: {
    position: 'absolute',
    height: 10,
    width: 10,
    borderColor: '#ffffff',
  },
  scanTopLeft: {
    top: 3,
    left: 3,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  scanTopRight: {
    top: 3,
    right: 3,
    borderTopWidth: 2,
    borderRightWidth: 2,
  },
  scanBottomLeft: {
    bottom: 3,
    left: 3,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
  },
  scanBottomRight: {
    right: 3,
    bottom: 3,
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  bagIcon: {
    height: 18,
    width: 18,
    borderWidth: 2,
    borderRadius: 5,
  },
  bagHandle: {
    position: 'absolute',
    top: -7,
    left: 4,
    height: 9,
    width: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  personIcon: {
    alignItems: 'center',
    gap: 2,
  },
  personHead: {
    height: 9,
    width: 9,
    borderRadius: 5,
    borderWidth: 2,
  },
  personBody: {
    height: 10,
    width: 17,
    borderWidth: 2,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 0,
  },
});
