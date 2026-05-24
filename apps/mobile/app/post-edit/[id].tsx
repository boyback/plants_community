import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

import { ErrorView, LoadingView } from '../../components/StateView';
import {
  absoluteAssetUrl,
  apiGet,
  apiPatch,
  apiUploadImage,
  type PostDetail,
} from '../../lib/api';
import { stripHtml } from '../../lib/format';
import { colors, spacing } from '../../lib/theme';

type PickedImage = {
  id: string;
  uri: string;
  url: string;
  uploading: boolean;
};

export default function PostEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagText, setTagText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<PostDetail>(`/api/posts/${id}`);
      setPost(data);
      setTitle(data.title);
      setContent(data.contentText || stripHtml(data.content) || '');
      setTagText((data.tags ?? []).join(' '));
      setImages(
        (data.images?.length ? data.images : data.cover ? [data.cover] : []).map((url, index) => ({
          id: `${index}-${url}`,
          uri: absoluteAssetUrl(url) || url,
          url,
          uploading: false,
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
        .slice(0, 10),
    [tagText],
  );

  const canSubmit =
    Boolean(post) &&
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
      name: asset.fileName || `post-${Date.now()}-${index}.jpg`,
      type: asset.mimeType || 'image/jpeg',
    }));

    setImages((current) => [
      ...current,
      ...picked.map(({ id: imageId, uri }) => ({ id: imageId, uri, url: '', uploading: true })),
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
              image.id === item.id ? { ...image, url: uploaded.url, uploading: false } : image,
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
    if (!id || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const nextImages = images.map((item) => item.url).filter(Boolean);
      await apiPatch(`/api/posts/${id}`, {
        title: title.trim(),
        content: content.trim(),
        tags,
        images: nextImages,
        cover: nextImages[0] ?? null,
      });
      router.replace(`/post/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingView label="正在加载编辑页..." />;
  if (!post) return <ErrorView message={error ?? '帖子不存在'} onRetry={load} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.page}
    >
      <Stack.Screen options={{ title: '编辑帖子' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.editor}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            placeholder="标题"
            placeholderTextColor={colors.muted}
            style={styles.titleInput}
          />
          <TextInput
            value={content}
            onChangeText={setContent}
            maxLength={2000}
            placeholder="正文"
            placeholderTextColor={colors.muted}
            multiline
            textAlignVertical="top"
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
                    onPress={() => setImages((current) => current.filter((image) => image.id !== item.id))}
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
            placeholder="空格或逗号分隔"
            placeholderTextColor={colors.muted}
            style={styles.tagInput}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={!canSubmit}
          onPress={submit}
          style={[styles.submitButton, !canSubmit && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>保存</Text>}
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
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
