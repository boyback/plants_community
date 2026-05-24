import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { apiPost, saveMobileAuth, type MobileLoginResponse } from '../lib/api';
import { colors, spacing } from '../lib/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = account.trim().length > 0 && password.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiPost<MobileLoginResponse>('/api/auth/mobile-login', {
        account: account.trim(),
        password,
      });
      await saveMobileAuth(result.auth);
      router.replace('/(tabs)/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <View style={styles.header}>
        <Text style={styles.brand}>肉友社</Text>
        <Text style={styles.subtitle}>登录后同步签到、收藏、交易和消息。</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>账号</Text>
          <TextInput
            value={account}
            onChangeText={setAccount}
            placeholder="用户名或昵称"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>密码</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="请输入密码"
            placeholderTextColor={colors.muted}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={submit}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          disabled={!canSubmit}
          onPress={submit}
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>登录</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  brand: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
  },
  form: {
    gap: spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fbfdf9',
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.leaf,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
