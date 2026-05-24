import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  type AddressSummary,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type AddressDraft = {
  id?: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  tag: string;
  isDefault: boolean;
};

const emptyDraft: AddressDraft = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  tag: '',
  isDefault: false,
};

export default function AddressesScreen() {
  const [items, setItems] = useState<AddressSummary[]>([]);
  const [draft, setDraft] = useState<AddressDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiGet<AddressSummary[]>('/api/addresses');
      setItems(data);
      if (data.length === 0) setDraft((current) => current ?? { ...emptyDraft, isDefault: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '地址加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const edit = (item: AddressSummary) => {
    setMessage(null);
    setDraft({
      id: item.id,
      name: item.name,
      phone: item.phone,
      province: item.province ?? '',
      city: item.city ?? '',
      district: item.district ?? '',
      detail: item.detail,
      tag: item.tag ?? '',
      isDefault: item.isDefault,
    });
  };

  const save = async () => {
    if (!draft || saving) return;
    if (!draft.name.trim() || !draft.phone.trim() || !draft.detail.trim()) {
      setError('请填写收件人、电话和详细地址');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim(),
      province: draft.province.trim() || undefined,
      city: draft.city.trim() || undefined,
      district: draft.district.trim() || undefined,
      detail: draft.detail.trim(),
      tag: draft.tag.trim() || undefined,
      isDefault: draft.isDefault,
    };

    try {
      if (draft.id) {
        await apiPatch<AddressSummary>(`/api/addresses/${draft.id}`, payload);
      } else {
        await apiPost<AddressSummary>('/api/addresses', payload);
      }
      setDraft(null);
      setMessage('地址已保存');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '地址保存失败');
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    if (actingId) return;
    setActingId(id);
    setMessage(null);
    try {
      await apiPost(`/api/addresses/${id}/default`);
      setMessage('默认地址已更新');
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置默认失败');
    } finally {
      setActingId(null);
    }
  };

  const remove = async (id: string) => {
    if (actingId) return;
    setActingId(id);
    setMessage(null);
    try {
      await apiDelete(`/api/addresses/${id}`);
      setMessage('地址已删除');
      if (draft?.id === id) setDraft(null);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除地址失败');
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <LoadingView label="正在加载收货地址..." />;
  if (error && items.length === 0 && !draft) return <ErrorView message={error} onRetry={() => load()} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.leaf}
            colors={[colors.leaf]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>收货地址</Text>
            <Text style={styles.desc}>下单时会优先使用默认地址。</Text>
          </View>
          <Pressable
            onPress={() => setDraft({ ...emptyDraft, isDefault: items.length === 0 })}
            style={styles.addButton}
          >
            <Text style={styles.addText}>新增</Text>
          </Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {draft ? (
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.sectionTitle}>{draft.id ? '编辑地址' : '新增地址'}</Text>
              <Pressable onPress={() => setDraft(null)}>
                <Text style={styles.cancelText}>取消</Text>
              </Pressable>
            </View>
            <View style={styles.row}>
              <TextInput
                value={draft.name}
                onChangeText={(value) => setDraft((current) => current && { ...current, name: value })}
                placeholder="收件人"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
              <TextInput
                value={draft.phone}
                onChangeText={(value) => setDraft((current) => current && { ...current, phone: value })}
                placeholder="手机号"
                placeholderTextColor={colors.muted}
                keyboardType="phone-pad"
                style={[styles.input, styles.flexInput]}
              />
            </View>
            <View style={styles.row}>
              <TextInput
                value={draft.province}
                onChangeText={(value) => setDraft((current) => current && { ...current, province: value })}
                placeholder="省"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
              <TextInput
                value={draft.city}
                onChangeText={(value) => setDraft((current) => current && { ...current, city: value })}
                placeholder="市"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
              <TextInput
                value={draft.district}
                onChangeText={(value) => setDraft((current) => current && { ...current, district: value })}
                placeholder="区"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
            </View>
            <TextInput
              value={draft.detail}
              onChangeText={(value) => setDraft((current) => current && { ...current, detail: value })}
              placeholder="详细地址"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.detailInput]}
            />
            <TextInput
              value={draft.tag}
              onChangeText={(value) => setDraft((current) => current && { ...current, tag: value })}
              placeholder="标签，如 家 / 公司"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <Pressable
              onPress={() => setDraft((current) => current && { ...current, isDefault: !current.isDefault })}
              style={styles.defaultToggle}
            >
              <View style={[styles.checkbox, draft.isDefault && styles.checkboxActive]}>
                <Text style={[styles.checkboxText, draft.isDefault && styles.checkboxTextActive]}>✓</Text>
              </View>
              <Text style={styles.defaultText}>设为默认地址</Text>
            </Pressable>
            <Pressable
              disabled={saving}
              onPress={save}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>保存地址</Text>}
            </Pressable>
          </View>
        ) : null}

        <View style={styles.list}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>暂无收货地址</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.phone}>{item.phone}</Text>
                    {item.isDefault ? <Text style={styles.defaultBadge}>默认</Text> : null}
                  </View>
                  {item.tag ? <Text style={styles.tag}>{item.tag}</Text> : null}
                </View>
                <Text style={styles.addressText}>{formatAddress(item)}</Text>
                <View style={styles.actions}>
                  {!item.isDefault ? (
                    <Pressable disabled={actingId !== null} onPress={() => setDefault(item.id)} style={styles.ghostButton}>
                      <Text style={styles.ghostText}>{actingId === item.id ? '处理中' : '设默认'}</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={() => edit(item)} style={styles.ghostButton}>
                    <Text style={styles.ghostText}>编辑</Text>
                  </Pressable>
                  <Pressable disabled={actingId !== null} onPress={() => remove(item.id)} style={styles.dangerButton}>
                    <Text style={styles.dangerText}>删除</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatAddress(item: AddressSummary) {
  return [item.province, item.city, item.district, item.detail].filter(Boolean).join(' ');
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  desc: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
  },
  addButton: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addText: {
    color: '#fff',
    fontSize: 13,
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
    lineHeight: 18,
  },
  editorCard: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  cancelText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  input: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.ink,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  detailInput: {
    minHeight: 78,
    lineHeight: 21,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkbox: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    width: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  checkboxActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leaf,
  },
  checkboxText: {
    color: 'transparent',
    fontSize: 13,
    fontWeight: '900',
  },
  checkboxTextActive: {
    color: '#fff',
  },
  defaultText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
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
  list: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  cardHeader: {
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  name: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  phone: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  defaultBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    color: colors.leaf,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tag: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '800',
  },
  addressText: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  ghostButton: {
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ghostText: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '900',
  },
  dangerButton: {
    borderRadius: 999,
    backgroundColor: '#fee2e2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  dangerText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
