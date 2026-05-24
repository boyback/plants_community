import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../../components/StateView';
import { apiGet, apiPatch, type MarketListingDetail } from '../../lib/api';
import { colors, spacing } from '../../lib/theme';

type TradeMode = MarketListingDetail['tradeMode'];

type ItemDraft = {
  id: string;
  title: string;
  priceYuan: string;
  stock: string;
  description: string;
  images: string[];
};

const tradeModes: { key: TradeMode; label: string }[] = [
  { key: 'platform_escrow', label: '平台担保' },
  { key: 'online_payment', label: '在线支付' },
  { key: 'external', label: '自行联系' },
];

export default function MarketEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<MarketListingDetail | null>(null);
  const [title, setTitle] = useState('');
  const [shipFrom, setShipFrom] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTradeModes, setSelectedTradeModes] = useState<TradeMode[]>(['platform_escrow']);
  const [externalUrl, setExternalUrl] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [tagText, setTagText] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MarketListingDetail>(`/api/market/listings/${id}`);
      setListing(data);
      setTitle(data.title);
      setShipFrom(data.shipFrom);
      setDescription(data.description ?? '');
      setSelectedTradeModes(data.tradeModes?.length ? data.tradeModes : [data.tradeMode]);
      setExternalUrl(data.externalUrl ?? '');
      setContactNote(data.contactNote ?? '');
      setTagText((data.tags ?? []).join(' '));
      setItems(
        data.items.map((item) => ({
          id: item.id,
          title: item.title,
          priceYuan: String(item.price / 100),
          stock: String(item.stock),
          description: item.description,
          images: item.images.length ? item.images : [item.cover],
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '编辑页加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const tags = useMemo(
    () =>
      tagText
        .split(/[,\s，、#]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8),
    [tagText],
  );

  const updateItem = (itemId: string, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)));
  };

  const toggleTradeMode = (mode: TradeMode) => {
    setSelectedTradeModes((current) => {
      if (current.includes(mode)) return current.length > 1 ? current.filter((item) => item !== mode) : current;
      return [...current, mode];
    });
  };

  const validate = () => {
    if (!listing) return '交易帖不存在';
    if (!title.trim()) return '请输入交易帖标题';
    if (!shipFrom.trim()) return '请输入发货地';
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const price = Math.round(Number(item.priceYuan) * 100);
      const stock = Number(item.stock);
      if (!item.title.trim()) return `商品 ${index + 1}：请输入标题`;
      if (!Number.isFinite(price) || price <= 0) return `商品 ${index + 1}：价格格式不正确`;
      if (!Number.isInteger(stock) || stock <= 0) return `商品 ${index + 1}：库存必须是正整数`;
      if (!item.description.trim()) return `商品 ${index + 1}：请输入说明`;
      if (item.images.length === 0) return `商品 ${index + 1}：至少需要一张图片`;
    }
    return null;
  };

  const submit = async () => {
    if (!id || saving) return;
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    if (!listing) return;
    const firstTaxon = listing.taxons[0];
    const category = firstTaxon?.categorySlug || listing.category;
    if (!category) {
      setError('缺少板块信息，无法保存');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiPatch<{ id: string }>(`/api/market/listings/${id}`, {
        title: title.trim(),
        category,
        genus: firstTaxon?.genusSlug || undefined,
        species: firstTaxon?.speciesSlug || undefined,
        taxons: listing.taxons.map((taxon) => ({
          categorySlug: taxon.categorySlug || category,
          genusSlug: taxon.genusSlug || undefined,
          speciesSlug: taxon.speciesSlug || undefined,
          label: taxon.label,
        })),
        shipFrom: shipFrom.trim(),
        description: description.trim() || undefined,
        tradeMode: selectedTradeModes[0] ?? 'platform_escrow',
        tradeModes: selectedTradeModes,
        externalUrl: externalUrl.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
        tags,
        items: items.map((item) => ({
          id: item.id,
          title: item.title.trim(),
          price: Math.round(Number(item.priceYuan) * 100),
          stock: Math.max(1, Number(item.stock) || 1),
          images: item.images,
          description: item.description.trim(),
        })),
      });
      router.replace(`/market/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView label="正在加载交易帖..." />;
  if (!listing) return <ErrorView message={error ?? '交易帖不存在'} onRetry={load} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <Stack.Screen options={{ title: '编辑交易帖' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>交易信息</Text>
          <TextInput value={title} onChangeText={setTitle} maxLength={60} style={styles.input} />
          <TextInput
            value={shipFrom}
            onChangeText={setShipFrom}
            maxLength={40}
            placeholder="发货地"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
            multiline
            textAlignVertical="top"
            placeholder="交易说明"
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.textarea]}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>交易方式</Text>
          <View style={styles.modeRow}>
            {tradeModes.map((mode) => {
              const active = selectedTradeModes.includes(mode.key);
              return (
                <Pressable
                  key={mode.key}
                  onPress={() => toggleTradeMode(mode.key)}
                  style={[styles.modeChip, active && styles.modeChipActive]}
                >
                  <Text style={[styles.modeText, active && styles.modeTextActive]}>{mode.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {selectedTradeModes.includes('external') ? (
            <>
              <TextInput
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="外部链接"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                style={styles.input}
              />
              <TextInput
                value={contactNote}
                onChangeText={setContactNote}
                placeholder="联系方式或说明"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </>
          ) : null}
        </View>

        {items.map((item, index) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.sectionTitle}>商品 {index + 1}</Text>
            <TextInput
              value={item.title}
              onChangeText={(value) => updateItem(item.id, { title: value })}
              maxLength={50}
              style={styles.input}
            />
            <View style={styles.row}>
              <TextInput
                value={item.priceYuan}
                onChangeText={(value) => updateItem(item.id, { priceYuan: value })}
                keyboardType="decimal-pad"
                placeholder="价格"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
              <TextInput
                value={item.stock}
                onChangeText={(value) => updateItem(item.id, { stock: value })}
                keyboardType="number-pad"
                placeholder="库存"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.flexInput]}
              />
            </View>
            <TextInput
              value={item.description}
              onChangeText={(value) => updateItem(item.id, { description: value })}
              maxLength={2000}
              multiline
              textAlignVertical="top"
              placeholder="商品说明"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.textarea]}
            />
            <Text style={styles.meta}>图片 {item.images.length} 张。需要换图可在 Web 端完整编辑。</Text>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>标签</Text>
          <TextInput
            value={tagText}
            onChangeText={setTagText}
            placeholder="空格或逗号分隔"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Pressable disabled={saving} onPress={submit} style={[styles.submitButton, saving && styles.disabled]}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>保存修改</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: 96,
  },
  card: {
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
  textarea: {
    minHeight: 96,
    lineHeight: 22,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  modeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  modeTextActive: {
    color: colors.leaf,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexInput: {
    flex: 1,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
  },
  footer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: colors.leaf,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
});
