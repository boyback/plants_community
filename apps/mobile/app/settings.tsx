import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import {
  API_BASE_URL,
  absoluteAssetUrl,
  apiGet,
  apiPatch,
  apiPost,
  apiUploadImage,
  clearMobileAuth,
  type AuthMe,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type PrivacyState = {
  showFollowing: boolean;
  showFollowers: boolean;
};

type NotificationPrefs = {
  like: boolean;
  comment: boolean;
  follow: boolean;
  mention: boolean;
  system: boolean;
  message: boolean;
};

const defaultNotificationPrefs: NotificationPrefs = {
  like: true,
  comment: true,
  follow: true,
  mention: true,
  system: true,
  message: true,
};

const locales = [
  { key: 'zh-CN', label: '简体中文' },
  { key: 'zh-TW', label: '繁體中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
  { key: 'ko', label: '한국어' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [me, setMe] = useState<AuthMe | null>(null);
  const [avatar, setAvatar] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [privacy, setPrivacy] = useState<PrivacyState>({
    showFollowing: true,
    showFollowers: true,
  });
  const [locale, setLocale] = useState('zh-CN');
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, localeData, notificationData] = await Promise.all([
        apiGet<AuthMe>('/api/auth/me'),
        apiGet<{ locale: string }>('/api/users/me/locale').catch(() => ({ locale: 'zh-CN' })),
        apiGet<NotificationPrefs>('/api/users/me/notification-preferences').catch(() => defaultNotificationPrefs),
      ]);
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setMe(data);
      setAvatar(data.user.avatar ?? '');
      setName(data.user.name);
      setBio(data.user.bio ?? '');
      setPrivacy(data.privacy ?? { showFollowing: true, showFollowers: true });
      setLocale(localeData.locale);
      setNotificationPrefs({ ...defaultNotificationPrefs, ...notificationData });
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置加载失败');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickAvatar = async () => {
    setMessage(null);
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('需要允许访问相册后才能选择头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const uploaded = await apiUploadImage({
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      setAvatar(uploaded.url);
      setMessage('头像已上传，保存后生效');
    } catch (err) {
      setError(err instanceof Error ? err.message : '头像上传失败');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!me?.user || savingProfile) return;
    const nextName = name.trim();
    const nextBio = bio.trim();
    if (nextName.length < 2) {
      setError('昵称至少 2 个字');
      return;
    }

    setSavingProfile(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (avatar !== (me.user.avatar ?? '')) payload.avatar = avatar;
      if (nextName !== me.user.name) payload.name = nextName;
      if (nextBio !== (me.user.bio ?? '')) payload.bio = nextBio;
      if (Object.keys(payload).length === 0) {
        setMessage('没有需要保存的修改');
        return;
      }
      const result = await apiPatch<{ ok: boolean; user?: AuthMe['user'] }>(
        '/api/users/me/profile',
        payload,
      );
      if (result.user) {
        setMe((current) => current && { ...current, user: result.user ?? current.user });
      }
      setMessage('资料已保存');
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '资料保存失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePrivacy = async (patch: Partial<PrivacyState>) => {
    if (savingPrivacy) return;
    const next = { ...privacy, ...patch };
    setPrivacy(next);
    setSavingPrivacy(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiPatch<PrivacyState>('/api/users/me/privacy', patch);
      setPrivacy(result);
      setMessage('隐私设置已保存');
    } catch (err) {
      setPrivacy(privacy);
      setError(err instanceof Error ? err.message : '隐私设置保存失败');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const updateLocale = async (nextLocale: string) => {
    if (savingLocale) return;
    const previous = locale;
    setLocale(nextLocale);
    setSavingLocale(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiPatch<{ locale: string }>('/api/users/me/locale', { locale: nextLocale });
      setLocale(result.locale);
      setMessage('语言偏好已保存');
    } catch (err) {
      setLocale(previous);
      setError(err instanceof Error ? err.message : '语言保存失败');
    } finally {
      setSavingLocale(false);
    }
  };

  const updateNotification = async (key: keyof NotificationPrefs, value: boolean) => {
    if (savingNotifications) return;
    const previous = notificationPrefs;
    const next = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(next);
    setSavingNotifications(true);
    setMessage(null);
    setError(null);
    try {
      const result = await apiPatch<NotificationPrefs>('/api/users/me/notification-preferences', { [key]: value });
      setNotificationPrefs({ ...defaultNotificationPrefs, ...result });
      setMessage('通知偏好已保存');
    } catch (err) {
      setNotificationPrefs(previous);
      setError(err instanceof Error ? err.message : '通知偏好保存失败');
    } finally {
      setSavingNotifications(false);
    }
  };

  const logout = async () => {
    await apiPost('/api/auth/logout').catch(() => null);
    await clearMobileAuth();
    router.replace('/login');
  };

  if (loading) return <LoadingView label="正在加载设置..." />;
  if (error && !me?.user) return <ErrorView message={error} onRetry={load} />;

  const avatarSource = absoluteAssetUrl(avatar);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>个人资料</Text>
          <View style={styles.avatarRow}>
            <Pressable onPress={pickAvatar} style={styles.avatarButton}>
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{name.slice(0, 1) || '肉'}</Text>
                </View>
              )}
              {uploadingAvatar ? (
                <View style={styles.avatarMask}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : null}
            </Pressable>
            <View style={styles.avatarCopy}>
              <Text style={styles.avatarTitle}>头像</Text>
              <Text style={styles.meta}>点击更换，建议使用正方形图片</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>昵称</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={24}
              placeholder="请输入昵称"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>简介</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              maxLength={200}
              multiline
              textAlignVertical="top"
              placeholder="一两句话介绍自己"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.bioInput]}
            />
            <Text style={styles.counter}>{bio.length}/200</Text>
          </View>

          <Pressable
            disabled={savingProfile || uploadingAvatar}
            onPress={saveProfile}
            style={[styles.primaryButton, (savingProfile || uploadingAvatar) && styles.disabled]}
          >
            {savingProfile ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>保存资料</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>隐私</Text>
            {savingPrivacy ? <ActivityIndicator color={colors.leaf} /> : null}
          </View>
          <SettingSwitch
            title="公开关注列表"
            desc="关闭后其他用户不能查看你关注的人"
            value={privacy.showFollowing}
            disabled={savingPrivacy}
            onValueChange={(value) => updatePrivacy({ showFollowing: value })}
          />
          <SettingSwitch
            title="公开粉丝列表"
            desc="关闭后其他用户不能查看你的粉丝"
            value={privacy.showFollowers}
            disabled={savingPrivacy}
            onValueChange={(value) => updatePrivacy({ showFollowers: value })}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>语言</Text>
            {savingLocale ? <ActivityIndicator color={colors.leaf} /> : null}
          </View>
          <View style={styles.localeGrid}>
            {locales.map((item) => {
              const active = locale === item.key;
              return (
                <Pressable
                  key={item.key}
                  disabled={savingLocale}
                  onPress={() => updateLocale(item.key)}
                  style={[styles.localeChip, active && styles.localeChipActive]}
                >
                  <Text style={[styles.localeText, active && styles.localeTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>通知</Text>
            {savingNotifications ? <ActivityIndicator color={colors.leaf} /> : null}
          </View>
          <SettingSwitch
            title="点赞"
            desc="有人点赞你的内容时通知"
            value={notificationPrefs.like}
            disabled={savingNotifications}
            onValueChange={(value) => updateNotification('like', value)}
          />
          <SettingSwitch
            title="评论"
            desc="有人评论你的内容时通知"
            value={notificationPrefs.comment}
            disabled={savingNotifications}
            onValueChange={(value) => updateNotification('comment', value)}
          />
          <SettingSwitch
            title="关注"
            desc="有人关注你时通知"
            value={notificationPrefs.follow}
            disabled={savingNotifications}
            onValueChange={(value) => updateNotification('follow', value)}
          />
          <SettingSwitch
            title="@ 提到"
            desc="有人提到你时通知"
            value={notificationPrefs.mention}
            disabled={savingNotifications}
            onValueChange={(value) => updateNotification('mention', value)}
          />
          <SettingSwitch
            title="系统消息"
            desc="保留重要交易和系统通知"
            value={notificationPrefs.system}
            disabled={savingNotifications}
            onValueChange={(value) => updateNotification('system', value)}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>应用</Text>
          <Pressable style={styles.navRow} onPress={() => router.push('/addresses')}>
            <Text style={styles.navLabel}>收货地址</Text>
            <Text style={styles.navChevron}>›</Text>
          </Pressable>
          <InfoRow label="接口地址" value={API_BASE_URL} />
          <InfoRow label="当前账号" value={me?.user?.name ?? '未登录'} />
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={logout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SettingSwitch({
  title,
  desc,
  value,
  disabled,
  onValueChange,
}: {
  title: string;
  desc: string;
  value: boolean;
  disabled: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchCopy}>
        <Text style={styles.switchTitle}>{title}</Text>
        <Text style={styles.meta}>{desc}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: '#d8e3d4', true: '#b7d9ad' }}
        thumbColor={value ? colors.leaf : '#fff'}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: {
    gap: spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarButton: {
    overflow: 'hidden',
    height: 76,
    width: 76,
    borderRadius: 38,
    backgroundColor: colors.leafSoft,
  },
  avatar: {
    height: '100%',
    width: '100%',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: colors.leaf,
    fontSize: 24,
    fontWeight: '900',
  },
  avatarMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarCopy: {
    flex: 1,
    gap: 3,
  },
  avatarTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
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
  bioInput: {
    minHeight: 92,
    lineHeight: 22,
  },
  counter: {
    alignSelf: 'flex-end',
    color: colors.muted,
    fontSize: 11,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.leaf,
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  switchCopy: {
    flex: 1,
    gap: 2,
  },
  switchTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  localeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  localeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  localeChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  localeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  localeTextActive: {
    color: colors.leaf,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.md,
  },
  navLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  navChevron: {
    color: colors.muted,
    fontSize: 24,
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
  message: {
    color: colors.leaf,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
});
