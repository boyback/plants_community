import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { colors } from '../lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: '登录' }} />
        <Stack.Screen name="compose" options={{ title: '发布' }} />
        <Stack.Screen name="market-sell" options={{ title: '发布交易帖' }} />
        <Stack.Screen name="market-edit/[id]" options={{ title: '编辑交易帖' }} />
        <Stack.Screen name="auctions" options={{ title: '拍卖' }} />
        <Stack.Screen name="auction/[id]" options={{ title: '拍卖详情' }} />
        <Stack.Screen name="post-edit/[id]" options={{ title: '编辑帖子' }} />
        <Stack.Screen name="my-posts" options={{ title: '我的帖子' }} />
        <Stack.Screen name="orders" options={{ title: '我的交易' }} />
        <Stack.Screen name="order/[id]" options={{ title: '订单详情' }} />
        <Stack.Screen name="payment/[payNo]" options={{ title: '支付' }} />
        <Stack.Screen name="collections" options={{ title: '我的收藏' }} />
        <Stack.Screen name="settings" options={{ title: '设置' }} />
        <Stack.Screen name="addresses" options={{ title: '收货地址' }} />
        <Stack.Screen name="notifications" options={{ title: '消息' }} />
        <Stack.Screen name="growth" options={{ title: '等级钻石' }} />
        <Stack.Screen name="search" options={{ title: '搜索' }} />
        <Stack.Screen name="ranking" options={{ title: '排行榜' }} />
        <Stack.Screen name="user/[id]" options={{ title: '用户主页' }} />
        <Stack.Screen name="user-connections/[id]" options={{ title: '用户列表' }} />
        <Stack.Screen name="board/[...path]" options={{ title: '图鉴详情' }} />
      </Stack>
    </>
  );
}
