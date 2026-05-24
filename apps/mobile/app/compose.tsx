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
  type PostSummary,
} from '../lib/api';
import { colors, spacing } from '../lib/theme';

type PublishBoard = {
  id: string;
  slug: string;
  name: string;
  scope: 'category' | 'genus';
  parentName?: string;
};

type PickedImage = {
  id: string;
  uri: string;
  url: string;
  uploading: boolean;
};

export default function ComposeScreen() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [boards, setBoards] = useState<PublishBoard[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagText, setTagText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
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
      setSelectedSlug((current) => current || flattened[0]?.slug || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布页加载失败');
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
        .slice(0, 10),
    [tagText],
  );

  const canSubmit =
    selectedSlug.length > 0 &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !images.some((item) => item.uploading) &&
    !submitting;

  const pickImages = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('需要允许访问相册后才能选择图片');
      return;
    }

    const remain = Math.max(0, 9 - images.length);
    if (remain === 0) {
      setError('最多选择 9 张图片');
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
      name: asset.fileName || `image-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));

    setImages((current) => [
      ...current,
      ...picked.map(({ id, uri }) => ({ id, uri, url: '', uploading: true })),
    ]);

    await Promise.all(
      picked.map(async (item) => {
        try {
          const uploaded = await apiUploadImage({
            uri: item.uri,
            name: item.name,
            type: item.type,
          });
          setImages((current) =>
            current.map((image) =>
              image.id === item.id
                ? { ...image, url: uploaded.url, uploading: false }
                : image,
            ),
          );
        } catch (err) {
          setImages((current) => current.filter((image) => image.id !== item.id));
          setError(err instanceof Error ? err.message : '图片上传失败');
        }
      }),
    );
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const board = boards.find((item) => item.slug === selectedSlug);
      const created = await apiPost<PostSummary>('/api/posts', {
        type: 'short',
        ...(board?.scope === 'genus'
          ? { genusSlug: selectedSlug }
          : { categorySlug: selectedSlug }),
        title: title.trim(),
        content: content.trim(),
        tags,
        cover: images[0]?.url || null,
        images: images.map((item) => item.url).filter(Boolean),
      });
      router.replace(`/post/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth || loadingBoards) return <LoadingView label="正在准备发布..." />;
  if (error && boards.length === 0) return <ErrorView message={error} onRetry={load} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>发布到</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.boardList}
          >
            {boards.map((board) => {
              const active = board.slug === selectedSlug;
              return (
                <Pressable
                  key={board.id}
                  onPress={() => setSelectedSlug(board.slug)}
                  style={[styles.boardChip, active && styles.boardChipActive]}
                >
                  <Text style={[styles.boardText, active && styles.boardTextActive]}>
                    {board.name}
                  </Text>
                  {board.parentName ? (
                    <Text style={[styles.boardMeta, active && styles.boardMetaActive]}>
                      {board.parentName}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.editor}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="标题"
            placeholderTextColor={colors.muted}
            maxLength={100}
            style={styles.titleInput}
          />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="分享状态、养护记录、问题描述..."
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
            maxLength={2000}
            style={styles.contentInput}
          />
          <View style={styles.counterRow}>
            <Text style={styles.counter}>{title.length}/100</Text>
            <Text style={styles.counter}>{content.length}/2000</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.imageHeader}>
            <Text style={styles.sectionTitle}>图片</Text>
            <Text style={styles.imageCount}>{images.length}/9</Text>
          </View>
          <View style={styles.imageGrid}>
            {images.map((item) => {
              const source = absoluteAssetUrl(item.url) || item.uri;
              return (
                <View key={item.id} style={styles.imageItem}>
                  <Image source={{ uri: source }} style={styles.image} />
                  {item.uploading ? (
                    <View style={styles.uploadMask}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() =>
                      setImages((current) => current.filter((image) => image.id !== item.id))
                    }
                    style={styles.removeImage}
                  >
                    <Text style={styles.removeImageText}>×</Text>
                  </Pressable>
                </View>
              );
            })}
            {images.length < 9 ? (
              <Pressable onPress={pickImages} style={styles.addImage}>
                <Text style={styles.addImagePlus}>+</Text>
                <Text style={styles.addImageText}>相册</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>标签</Text>
          <TextInput
            value={tagText}
            onChangeText={setTagText}
            placeholder="用空格或逗号分隔，最多 10 个"
            placeholderTextColor={colors.muted}
            style={styles.tagInput}
          />
          {tags.length > 0 ? (
            <View style={styles.tagPreview}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
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
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>发布</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function flattenBoards(data: BoardSummary[]): PublishBoard[] {
  const result: PublishBoard[] = [];
  data.forEach((board) => {
    result.push({
      id: board.id,
      slug: board.slug,
      name: board.name,
      scope: 'category',
    });
    board.genera?.forEach((genus) => {
      result.push({
        id: genus.id,
        slug: genus.slug,
        name: genus.name,
        scope: 'genus',
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
    paddingBottom: 96,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  boardList: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  boardChip: {
    minWidth: 92,
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
    fontWeight: '800',
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
  editor: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
    padding: spacing.md,
  },
  contentInput: {
    minHeight: 260,
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
    padding: spacing.md,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  counter: {
    color: colors.muted,
    fontSize: 12,
  },
  imageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    height: 96,
    width: 96,
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
    height: 96,
    width: 96,
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
  },
  addImagePlus: {
    color: colors.leaf,
    fontSize: 28,
    fontWeight: '600',
  },
  addImageText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  tagInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  tagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    borderRadius: 999,
    backgroundColor: colors.leafSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  tagText: {
    color: colors.leaf,
    fontSize: 12,
    fontWeight: '800',
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
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
