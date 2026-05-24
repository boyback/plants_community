import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '../../lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.leaf,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontSize: 17, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '首页', tabBarLabel: '首页', tabBarIcon: ({ color }) => <TabIcon color={color} label="⌂" /> }} />
      <Tabs.Screen name="boards" options={{ title: '图鉴', tabBarLabel: '图鉴', tabBarIcon: ({ color }) => <TabIcon color={color} label="▦" /> }} />
      <Tabs.Screen name="market" options={{ title: '交易', tabBarLabel: '交易', tabBarIcon: ({ color }) => <TabIcon color={color} label="¥" /> }} />
      <Tabs.Screen name="profile" options={{ title: '我的', tabBarLabel: '我的', tabBarIcon: ({ color }) => <TabIcon color={color} label="●" /> }} />
    </Tabs>
  );
}

function TabIcon({ color, label }: { color: string; label: string }) {
  return (
    <Text style={{ color, fontSize: 19, fontWeight: '900', lineHeight: 22 }}>
      {label}
    </Text>
  );
}
