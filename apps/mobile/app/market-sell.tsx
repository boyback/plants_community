import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Text,
  TextInput,
  View,
} from 'react-native';

import { ErrorView, LoadingView } from '../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  apiPost,
  apiUploadImage,
  type AuthMe,
  type BoardSummary,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type TradeMode = 'platform_escrow' | 'online_payment' | 'external';

type SellBoard = {
  id: string;
  categorySlug: string;
  genusSlug?: string;
  name: string;
  parentName?: string;
};

type PickedImage = {
  id: string;
  uri: string;
  url: string;
  uploading: boolean;
};

type ProductDraft = {
  clientId: string;
  title: string;
  priceYuan: string;
  stock: string;
  description: string;
  images: PickedImage[];
};

const tradeModes: { key: TradeMode; label: string; desc: string }[] = [
  { key: 'platform_escrow', label: '平台担保', desc: '适合高价值交易' },
  { key: 'online_payment', label: '在线支付', desc: '买家可直接下单' },
  { key: 'external', label: '自行联系', desc: '私信或三方平台交易' },
];

function createClientId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function emptyProduct(): ProductDraft {
  return {
    clientId: createClientId(),
    title: '',
    priceYuan: '',
    stock: '1',
    description: '',
    images: [],
  };
}

export default function MarketSellScreen() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [boards, setBoards] = useState<SellBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [title, setTitle] = useState('');
  const [shipFrom, setShipFrom] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTradeModes, setSelectedTradeModes] = useState<TradeMode[]>(['platform_escrow']);
  const [externalUrl, setExternalUrl] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [tagText, setTagText] = useState('');
  const [products, setProducts] = useState<ProductDraft[]>([emptyProduct()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCheckingAuth(true);
    setLoadingBoards(true);
    setError(null);
    try {
      const me = await apiGet<AuthMe>('/api/auth/me');
      if (!me?.user) {
        router.replace('/login');
        return;
      }
      const data = await apiGet<BoardSummary[]>('/api/boards?kind=family&withGenera=1');
      const flattened = flattenBoards(data);
      setBoards(flattened);
      setSelectedBoardId((current) => current || flattened[0]?.id || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布交易页加载失败');
    } finally {
      setCheckingAuth(false);
      setLoadingBoards(false);
    }
  }, [router]);

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

  const selectedBoard = boards.find((item) => item.id === selectedBoardId);
  const uploading = products.some((product) => product.images.some((image) => image.uploading));
  const canSubmit = !submitting && !uploading;

  const updateProduct = (clientId: string, patch: Partial<ProductDraft>) => {
    setProducts((current) =>
      current.map((product) => (product.clientId === clientId ? { ...product, ...patch } : product)),
    );
  };

  const removeProduct = (clientId: string) => {
    setProducts((current) => (current.length > 1 ? current.filter((item) => item.clientId !== clientId) : current));
  };

  const toggleTradeMode = (mode: TradeMode) => {
    setSelectedTradeModes((current) => {
      if (current.includes(mode)) {
        return current.length > 1 ? current.filter((item) => item !== mode) : current;
      }
      return [...current, mode];
    });
  };

  const pickImages = async (clientId: string) => {
    setError(null);
    const product = products.find((item) => item.clientId === clientId);
    if (!product) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('需要允许访问相册后才能选择图片');
      return;
    }

    const remain = Math.max(0, 9 - product.images.length);
    if (remain === 0) {
      setError('每个商品最多选择 9 张图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remain,
      quality: 0.9,
    });
    if (result.canceled) return;

    const picked = result.assets.slice(0, remain).map((asset, index) => ({
      id: `${Date.now()}-${index}`,
      uri: asset.uri,
      url: '',
      uploading: true,
      name: asset.fileName || `market-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));

    updateProduct(clientId, {
      images: [
        ...product.images,
        ...picked.map(({ id, uri }) => ({ id, uri, url: '', uploading: true })),
      ],
    });

    await Promise.all(
      picked.map(async (item) => {
        try {
          const uploaded = await apiUploadImage({
            uri: item.uri,
            name: item.name,
            type: item.type,
          });
          setProducts((current) =>
            current.map((draft) =>
              draft.clientId === clientId
                ? {
                    ...draft,
                    images: draft.images.map((image) =>
                      image.id === item.id ? { ...image, url: uploaded.url, uploading: false } : image,
                    ),
                  }
                : draft,
            ),
          );
        } catch (err) {
          setProducts((current) =>
            current.map((draft) =>
              draft.clientId === clientId
                ? { ...draft, images: draft.images.filter((image) => image.id !== item.id) }
                : draft,
            ),
          );
          setError(err instanceof Error ? err.message : '图片上传失败');
        }
      }),
    );
  };

  const removeImage = (clientId: string, imageId: string) => {
    setProducts((current) =>
      current.map((product) =>
        product.clientId === clientId
          ? { ...product, images: product.images.filter((image) => image.id !== imageId) }
          : product,
      ),
    );
  };

  const validate = () => {
    if (!title.trim()) return '请输入交易帖标题';
    if (!selectedBoard) return '请选择板块';
    if (!shipFrom.trim()) return '请输入发货地';
    if (selectedTradeModes.includes('external') && !externalUrl.trim() && !contactNote.trim()) {
      return '自行联系交易请填写联系方式或外部链接';
    }

    for (let index = 0; index < products.length; index += 1) {
      const product = products[index];
      const prefix = `商品 ${index + 1}`;
      const price = Math.round(Number(product.priceYuan) * 100);
      const stock = Number(product.stock);
      const images = product.images.map((image) => image.url).filter(Boolean);
      if (!product.title.trim()) return `${prefix}：请输入商品标题`;
      if (!Number.isFinite(price) || price <= 0) return `${prefix}：价格格式不正确`;
      if (!Number.isInteger(stock) || stock <= 0) return `${prefix}：库存必须是正整数`;
      if (images.length === 0) return `${prefix}：请至少上传一张图片`;
      if (!product.description.trim()) return `${prefix}：请输入商品说明`;
    }
    return null;
  };

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    if (!selectedBoard) return;

    setSubmitting(true);
    try {
      const result = await apiPost<{ id: string }>('/api/market/listings', {
        title: title.trim(),
        category: selectedBoard.categorySlug,
        genus: selectedBoard.genusSlug || undefined,
        taxons: [
          {
            categorySlug: selectedBoard.categorySlug,
            genusSlug: selectedBoard.genusSlug || undefined,
            label: selectedBoard.parentName
              ? `${selectedBoard.parentName} / ${selectedBoard.name}`
              : selectedBoard.name,
          },
        ],
        shipFrom: shipFrom.trim(),
        description: description.trim() || undefined,
        tradeMode: selectedTradeModes[0] ?? 'platform_escrow',
        tradeModes: selectedTradeModes,
        externalUrl: externalUrl.trim() || undefined,
        contactNote: contactNote.trim() || undefined,
        tags,
        items: products.map((product) => ({
          title: product.title.trim(),
          price: Math.round(Number(product.priceYuan) * 100),
          stock: Math.max(1, Number(product.stock) || 1),
          images: product.images.map((image) => image.url).filter(Boolean),
          description: product.description.trim(),
        })),
      });
      router.replace(`/market/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布交易帖失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth || loadingBoards) return <LoadingView label="正在准备交易发布..." />;
  if (error && boards.length === 0) return <ErrorView message={error} onRetry={load} />;

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
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>发布交易帖</Text>
          <Text style={styles.heroDesc}>先描述整笔交易，再逐个添加商品。</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>交易信息</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            placeholder="交易帖标题"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <View style={styles.inlineInputs}>
            <TextInput
              value={shipFrom}
              onChangeText={setShipFrom}
              maxLength={40}
              placeholder="发货地"
              placeholderTextColor={colors.muted}
              style={[styles.input, styles.inlineInput]}
            />
          </View>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={2000}
            placeholder="交易说明：打包、发货时间、售后规则等"
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textarea]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>板块品种</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardList}>
            {boards.map((board) => {
              const active = board.id === selectedBoardId;
              return (
                <Pressable
                  key={board.id}
                  onPress={() => setSelectedBoardId(board.id)}
                  style={[styles.boardChip, active && styles.boardChipActive]}
                >
                  <Text style={[styles.boardText, active && styles.boardTextActive]} numberOfLines={1}>
                    {board.name}
                  </Text>
                  {board.parentName ? (
                    <Text style={[styles.boardMeta, active && styles.boardMetaActive]} numberOfLines={1}>
                      {board.parentName}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>交易方式</Text>
          <View style={styles.modeGrid}>
            {tradeModes.map((mode) => {
              const active = selectedTradeModes.includes(mode.key);
              return (
                <Pressable
                  key={mode.key}
                  onPress={() => toggleTradeMode(mode.key)}
                  style={[styles.modeCard, active && styles.modeCardActive]}
                >
                  <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{mode.label}</Text>
                  <Text style={styles.modeDesc}>{mode.desc}</Text>
                </Pressable>
              );
            })}
          </View>
          {selectedTradeModes.includes('external') ? (
            <View style={styles.externalBox}>
              <TextInput
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="外部链接，可选"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                style={styles.input}
              />
              <TextInput
                value={contactNote}
                onChangeText={setContactNote}
                maxLength={500}
                placeholder="联系方式或说明"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>商品信息</Text>
          <Pressable
            disabled={products.length >= 20}
            onPress={() => setProducts((current) => [...current, emptyProduct()])}
            style={[styles.addProductButton, products.length >= 20 && styles.disabled]}
          >
            <Text style={styles.addProductText}>添加商品</Text>
          </Pressable>
        </View>

        {products.map((product, index) => (
          <View key={product.clientId} style={styles.productCard}>
            <View style={styles.productHeader}>
              <Text style={styles.productIndex}>商品 {index + 1}</Text>
              {products.length > 1 ? (
                <Pressable onPress={() => removeProduct(product.clientId)}>
                  <Text style={styles.deleteText}>删除</Text>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              value={product.title}
              onChangeText={(value) => updateProduct(product.clientId, { title: value })}
              maxLength={50}
              placeholder="商品标题"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                value={product.priceYuan}
                onChangeText={(value) => updateProduct(product.clientId, { priceYuan: value })}
                keyboardType="decimal-pad"
                placeholder="价格"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.inlineInput]}
              />
              <TextInput
                value={product.stock}
                onChangeText={(value) => updateProduct(product.clientId, { stock: value })}
                keyboardType="number-pad"
                placeholder="库存"
                placeholderTextColor={colors.muted}
                style={[styles.input, styles.inlineInput]}
              />
            </View>
            <TextInput
              value={product.description}
              onChangeText={(value) => updateProduct(product.clientId, { description: value })}
              maxLength={2000}
              placeholder="商品说明"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.productTextarea]}
            />
            <View style={styles.imageHeader}>
              <Text style={styles.imageTitle}>图片</Text>
              <Text style={styles.imageCount}>{product.images.length}/9</Text>
            </View>
            <View style={styles.imageGrid}>
              {product.images.map((image) => {
                const source = absoluteAssetUrl(image.url) || image.uri;
                return (
                  <View key={image.id} style={styles.imageItem}>
                    <Image source={{ uri: source }} style={styles.image} />
                    {image.uploading ? (
                      <View style={styles.uploadMask}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => removeImage(product.clientId, image.id)}
                      style={styles.removeImage}
                    >
                      <Text style={styles.removeImageText}>×</Text>
                    </Pressable>
                  </View>
                );
              })}
              {product.images.length < 9 ? (
                <Pressable onPress={() => pickImages(product.clientId)} style={styles.addImage}>
                  <Text style={styles.addImagePlus}>+</Text>
                  <Text style={styles.addImageText}>相册</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>标签</Text>
          <TextInput
            value={tagText}
            onChangeText={setTagText}
            placeholder="空格或逗号分隔，最多 8 个"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {tags.length > 0 ? (
            <View style={styles.tagPreview}>
              {tags.map((tag) => (
                <Text key={tag} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={!canSubmit}
          onPress={submit}
          style={[styles.submitButton, !canSubmit && styles.disabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{uploading ? '图片上传中...' : '发布交易帖'}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function flattenBoards(data: BoardSummary[]): SellBoard[] {
  const result: SellBoard[] = [];
  data.forEach((board) => {
    result.push({
      id: board.id,
      categorySlug: board.slug,
      name: board.name,
    });
    board.genera?.forEach((genus) => {
      result.push({
        id: genus.id,
        categorySlug: board.slug,
        genusSlug: genus.slug,
        name: genus.name,
        parentName: board.name,
      });
    });
  });
  return result;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: 108,
  },
  hero: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: '900',
  },
  heroDesc: {
    color: colors.muted,
    fontSize: 14,
  },
  card: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
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
    minHeight: 108,
    lineHeight: 22,
  },
  productTextarea: {
    minHeight: 86,
    lineHeight: 22,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
  },
  boardList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  boardChip: {
    width: 108,
    gap: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  boardChipActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  boardText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  boardTextActive: {
    color: colors.leaf,
  },
  boardMeta: {
    color: colors.muted,
    fontSize: 11,
  },
  boardMetaActive: {
    color: colors.leaf,
  },
  modeGrid: {
    gap: spacing.sm,
  },
  modeCard: {
    gap: 3,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  modeCardActive: {
    borderColor: colors.leaf,
    backgroundColor: colors.leafSoft,
  },
  modeLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  modeLabelActive: {
    color: colors.leaf,
  },
  modeDesc: {
    color: colors.muted,
    fontSize: 12,
  },
  externalBox: {
    gap: spacing.sm,
  },
  addProductButton: {
    borderRadius: 999,
    backgroundColor: colors.leaf,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addProductText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  productCard: {
    gap: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productIndex: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '900',
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imageTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  imageCount: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  imageItem: {
    overflow: 'hidden',
    height: 82,
    width: 82,
    borderRadius: 14,
    backgroundColor: colors.leafSoft,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  uploadMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  removeImage: {
    position: 'absolute',
    top: 6,
    right: 6,
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
    width: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
  addImage: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 82,
    width: 82,
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.background,
  },
  addImagePlus: {
    color: colors.leaf,
    fontSize: 24,
    fontWeight: '700',
  },
  addImageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  error: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
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
