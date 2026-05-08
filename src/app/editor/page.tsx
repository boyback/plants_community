'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { PostType, Board } from '@/lib/types';
import { Shell } from '@/components/layout/Shell';
import { TypePicker } from '@/components/post/TypePicker';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';

interface Draft {
  id: string;
  title: string;
  type: PostType;
  savedAt: string;
  payload: Record<string, unknown> | null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <EditorInner />
    </Suspense>
  );
}

function EditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [categories, setCategories] = useState<Board[]>([]);
  const [generaList, setGeneraList] = useState<Board[]>([]);
  const [speciesList, setSpeciesList] = useState<Board[]>([]);
  const [type, setType] = useState<PostType>('rich');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); // 用于 short/video/vote 的纯文本说明
  const [contentJson, setContentJson] = useState<unknown>(null); // 用于 rich/event 的 ProseMirror JSON
  // 三级板块 slug(独立,提交时取最细粒度)
  const [categorySlug, setCategorySlug] = useState(
    searchParams.get('category') ?? searchParams.get('board') ?? ''
  );
  const [genusSlug, setGenusSlug] = useState(searchParams.get('genus') ?? '');
  const [speciesSlug, setSpeciesSlug] = useState(searchParams.get('species') ?? '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState('');
  const [voteOptions, setVoteOptions] = useState<string[]>(['', '']);
  const [voteMulti, setVoteMulti] = useState(false);
  const [voteDeadline, setVoteDeadline] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 拉一级(科)
  useEffect(() => {
    api
      .get<Board[]>('/api/categories')
      .then((list) => {
        setCategories(list);
        if (!categorySlug && list[0]) setCategorySlug(list[0].slug);
      })
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 科变化 → 拉属列表
  useEffect(() => {
    if (!categorySlug) {
      setGeneraList([]);
      setGenusSlug('');
      return;
    }
    api
      .get<{ genera: Board[] }>(`/api/categories/${encodeURIComponent(categorySlug)}`)
      .then((r) => setGeneraList(r.genera ?? []))
      .catch(() => setGeneraList([]));
  }, [categorySlug]);

  // 属变化 → 拉品种列表
  useEffect(() => {
    if (!genusSlug) {
      setSpeciesList([]);
      setSpeciesSlug('');
      return;
    }
    api
      .get<{ species: Board[] }>(
        `/api/genera/${encodeURIComponent(genusSlug)}?category=${encodeURIComponent(categorySlug)}`
      )
      .then((r) => setSpeciesList(r.species ?? []))
      .catch(() => setSpeciesList([]));
  }, [genusSlug, categorySlug]);

  // 拉草稿
  const loadDrafts = async () => {
    if (!user) return;
    try {
      const list = await api.get<Draft[]>('/api/drafts');
      setDrafts(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!authLoading && user) loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const buildPayload = () => ({
    type,
    title,
    content,
    contentJson,
    categorySlug,
    genusSlug,
    speciesSlug,
    tags,
    images,
    videoUrl,
    voteOptions,
    voteMulti,
    voteDeadline,
    eventLocation,
    eventStartAt,
  });

  // 根据当前类型判断"内容是否非空"
  const hasContent = () => {
    if (type === 'rich' || type === 'event') {
      // 检查 ProseMirror JSON 是否含实际节点(非空段落)
      const j = contentJson as { content?: unknown[] } | null;
      if (!j || !Array.isArray(j.content) || j.content.length === 0) return false;
      return true;
    }
    return !!content.trim();
  };

  const onSaveDraft = async () => {
    if (!title.trim() && !hasContent()) {
      showToast(t('editor.errors.contentRequired'));
      return;
    }
    try {
      const res = await api.post<{ id: string; savedAt: string }>('/api/drafts', {
        id: currentDraftId ?? undefined,
        title: title || '(untitled)',
        type,
        payload: buildPayload(),
      });
      setCurrentDraftId(res.id);
      await loadDrafts();
      showToast(t('editor.draftSaved') + ' 💾');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('common.retry'));
    }
  };

  const onLoadDraft = (d: Draft) => {
    const p = (d.payload as any) ?? {};
    setType((p.type as PostType) ?? d.type);
    setTitle(p.title ?? d.title ?? '');
    setContent(p.content ?? '');
    setContentJson(p.contentJson ?? null);
    setCategorySlug(p.categorySlug ?? p.boardSlug ?? categorySlug);
    setGenusSlug(p.genusSlug ?? '');
    setSpeciesSlug(p.speciesSlug ?? '');
    setTags(p.tags ?? []);
    setImages(p.images ?? []);
    setVideoUrl(p.videoUrl ?? '');
    setVoteOptions(p.voteOptions ?? ['', '']);
    setVoteMulti(!!p.voteMulti);
    setVoteDeadline(p.voteDeadline ?? '');
    setEventLocation(p.eventLocation ?? '');
    setEventStartAt(p.eventStartAt ?? '');
    setCurrentDraftId(d.id);
    showToast(t('editor.draftSaved'));
  };

  const onDeleteDraft = async (id: string) => {
    await api.delete(`/api/drafts/${id}`).catch(() => null);
    if (currentDraftId === id) setCurrentDraftId(null);
    await loadDrafts();
  };

  const onPublish = async () => {
    if (!title.trim()) return showToast(t('editor.errors.titleRequired'));
    if (type === 'short' && !content.trim()) return showToast(t('editor.errors.contentRequired'));
    if (type === 'rich' && !hasContent()) return showToast(t('editor.errors.contentRequired'));
    if (type === 'event' && !hasContent()) return showToast(t('editor.errors.contentRequired'));
    if (type === 'video' && !videoUrl.trim()) return showToast(t('editor.errors.videoUrlRequired'));
    if (type === 'vote' && voteOptions.filter((x) => x.trim()).length < 2)
      return showToast(t('editor.errors.voteOptionsMin'));
    if (type === 'vote' && !voteDeadline)
      return showToast(t('editor.voteDeadline'));
    if (type === 'event' && (!eventLocation.trim() || !eventStartAt))
      return showToast(t('editor.event'));

    const isRich = type === 'rich' || type === 'event';

    if (!categorySlug && !genusSlug && !speciesSlug) return showToast(t('editor.chooseBoard'));

    setSubmitting(true);
    try {
      const body: any = {
        type,
        // 优先传最细粒度的 slug
        ...(speciesSlug
          ? { speciesSlug }
          : genusSlug
          ? { genusSlug }
          : { categorySlug }),
        title,
        // rich/event 用 contentJson 字段;short/video/vote 用纯文本
        ...(isRich
          ? { contentJson }
          : { content }),
        tags,
        ...(images.length > 0 && { images }),
        ...(type === 'video' && { videoUrl }),
        ...(type === 'vote' && {
          vote: {
            question: title,
            options: voteOptions.filter((x) => x.trim()),
            multi: voteMulti,
            deadline: new Date(voteDeadline).toISOString(),
          },
        }),
        ...(type === 'event' && {
          event: {
            location: eventLocation,
            startAt: new Date(eventStartAt).toISOString(),
            endAt: new Date(eventStartAt).toISOString(),
          },
        }),
      };
      const created = await api.post<{ id: string }>('/api/posts', body);

      // 发布成功后删除草稿
      if (currentDraftId) {
        await api.delete(`/api/drafts/${currentDraftId}`).catch(() => null);
      }
      showToast('🎉 ' + t('editor.submit'));
      setTimeout(() => router.push(`/post/${created.id}`), 800);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : t('error.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">✍️</div>
          <div className="mt-3 text-lg font-semibold">{t('error.unauthorized')}</div>
          <p className="mt-1 text-sm text-leaf-700/70">
            {t('editor.title')}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login?redirect=/editor" className="btn-primary">
              {t('nav.login')}
            </Link>
            <Link href="/register" className="btn-outline">
              {t('nav.register')}
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-5">
          <div className="card p-6">
            <h1 className="mb-4 text-xl font-semibold">{t('editor.title')}</h1>
            <div className="mb-5">
              <div className="mb-2 text-xs font-medium text-leaf-700/80">{t('editor.pickType')}</div>
              <TypePicker value={type} onChange={setType} />
            </div>

            <div className="space-y-4">
              <Row label={t('editor.chooseBoard')}>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    value={categorySlug}
                    onChange={(e) => {
                      setCategorySlug(e.target.value);
                      setGenusSlug('');
                      setSpeciesSlug('');
                    }}
                    className="input"
                  >
                    <option value="">-- {t('editor.chooseBoard')} --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={genusSlug}
                    onChange={(e) => {
                      setGenusSlug(e.target.value);
                      setSpeciesSlug('');
                    }}
                    className="input"
                    disabled={!categorySlug || generaList.length === 0}
                  >
                    <option value="">
                      {!categorySlug
                        ? t('editor.chooseBoard')
                        : generaList.length === 0
                        ? t('common.empty')
                        : '-- ' + t('editor.chooseBoard') + ' --'}
                    </option>
                    {generaList.map((g) => (
                      <option key={g.id} value={g.slug}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={speciesSlug}
                    onChange={(e) => setSpeciesSlug(e.target.value)}
                    className="input"
                    disabled={!genusSlug || speciesList.length === 0}
                  >
                    <option value="">
                      {!genusSlug
                        ? t('editor.chooseBoard')
                        : speciesList.length === 0
                        ? t('common.empty')
                        : '-- ' + t('editor.chooseBoard') + ' --'}
                    </option>
                    {speciesList.map((s) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mt-1 text-[10px] text-leaf-700/60">
                  {t('editor.chooseBoard')}
                </div>
              </Row>

              <Row label={t('editor.placeholderTitle')}>
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('editor.placeholderTitle')}
                  maxLength={60}
                />
                <div className="mt-1 text-right text-[11px] text-leaf-700/60">
                  {title.length} / 60
                </div>
              </Row>

              {type === 'rich' && (
                <Row label={t('editor.placeholderRich')}>
                  <RichTextEditor
                    value={contentJson}
                    onChange={setContentJson}
                    placeholder={t('editor.placeholderRich')}
                    minHeight={300}
                    charLimit={20000}
                  />
                </Row>
              )}

              {type === 'short' && (
                <Row label={t('editor.placeholderShort')}>
                  <textarea
                    className="input min-h-[140px]"
                    placeholder={t('editor.placeholderShort')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={500}
                  />
                  <div className="mt-1 text-right text-[11px] text-leaf-700/60">
                    {content.length} / 500
                  </div>
                </Row>
              )}

              {type === 'video' && (
                <>
                  <Row label={t('editor.video')}>
                    <input
                      className="input"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder={t('editor.videoUrlPlaceholder')}
                    />
                  </Row>
                  <Row label={t('editor.video')}>
                    <textarea
                      className="input min-h-[100px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t('editor.placeholderShort')}
                    />
                  </Row>
                </>
              )}

              {type === 'vote' && (
                <>
                  <Row label={t('editor.vote')}>
                    <textarea
                      className="input min-h-[80px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={t('editor.voteQuestion')}
                    />
                  </Row>
                  <Row label={t('editor.vote')}>
                    <div className="space-y-2">
                      {voteOptions.map((o, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            className="input"
                            value={o}
                            onChange={(e) => {
                              const next = [...voteOptions];
                              next[i] = e.target.value;
                              setVoteOptions(next);
                            }}
                            placeholder={`${t('editor.voteAddOption')} ${i + 1}`}
                          />
                          {voteOptions.length > 2 && (
                            <button
                              type="button"
                              className="btn-outline !px-3"
                              onClick={() =>
                                setVoteOptions(voteOptions.filter((_, k) => k !== i))
                              }
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {voteOptions.length < 8 && (
                        <button
                          type="button"
                          className="btn-ghost !text-xs"
                          onClick={() => setVoteOptions([...voteOptions, ''])}
                        >
                          <Icon name="plus" size={14} />
                          {t('editor.voteAddOption')}
                        </button>
                      )}
                    </div>
                  </Row>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label={t('editor.voteMulti')}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={voteMulti}
                          onChange={(e) => setVoteMulti(e.target.checked)}
                          className="h-4 w-4 accent-leaf-500"
                        />
                        {t('editor.voteMulti')}
                      </label>
                    </Row>
                    <Row label={t('editor.voteDeadline')}>
                      <input
                        type="datetime-local"
                        className="input"
                        value={voteDeadline}
                        onChange={(e) => setVoteDeadline(e.target.value)}
                      />
                    </Row>
                  </div>
                </>
              )}

              {type === 'event' && (
                <>
                  <Row label={t('editor.event')}>
                    <RichTextEditor
                      value={contentJson}
                      onChange={setContentJson}
                      placeholder={t('editor.event')}
                      minHeight={200}
                      charLimit={5000}
                    />
                  </Row>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Row label={t('editor.eventLocation')}>
                      <input
                        className="input"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder={t('editor.eventLocation')}
                      />
                    </Row>
                    <Row label={t('editor.eventStartAt')}>
                      <input
                        type="datetime-local"
                        className="input"
                        value={eventStartAt}
                        onChange={(e) => setEventStartAt(e.target.value)}
                      />
                    </Row>
                  </div>
                </>
              )}

              <Row label={t('editor.images')}>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-leaf-200 bg-white p-2">
                  {images.map((src, i) => (
                    <span
                      key={i}
                      className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
                    >
                      🖼 {src.slice(0, 32)}...
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, k) => k !== i))}
                        className="text-leaf-600 hover:text-leaf-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 bg-transparent px-1 text-sm outline-none min-w-[120px]"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && imageInput.trim()) {
                        e.preventDefault();
                        if (images.length < 9) {
                          setImages([...images, imageInput.trim()]);
                          setImageInput('');
                        }
                      }
                    }}
                    placeholder={
                      images.length >= 9 ? t('editor.imagesHint') : t('editor.images')
                    }
                    disabled={images.length >= 9}
                  />
                </div>
              </Row>

              <Row label={t('editor.tags')}>
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-leaf-200 bg-white p-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((x) => x !== tag))}
                        className="text-leaf-600 hover:text-leaf-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 bg-transparent px-1 text-sm outline-none min-w-[120px]"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const v = tagInput.trim().replace(/^#/, '');
                        if (v && !tags.includes(v) && tags.length < 6) {
                          setTags([...tags, v]);
                        }
                        setTagInput('');
                      }
                    }}
                    placeholder={tags.length >= 6 ? t('editor.tagsHint') : t('editor.tags')}
                    disabled={tags.length >= 6}
                  />
                </div>
              </Row>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-leaf-100 pt-4">
              <div className="text-xs text-leaf-700/70">
                {currentDraftId ? t('editor.saveDraft') : t('editor.title')}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onSaveDraft} className="btn-outline">
                  <Icon name="edit" size={14} />
                  {t('editor.saveDraft')}
                </button>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={submitting}
                  className="btn-primary"
                >
                  <Icon name="check" size={14} />
                  {submitting ? t('editor.submitting') : t('editor.submit')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-800">📦 {t('editor.saveDraft')}</div>
              <span className="text-[11px] text-leaf-700/70">{drafts.length}</span>
            </div>
            {drafts.length === 0 ? (
              <p className="text-center text-xs text-leaf-700/60 py-4">
                {t('common.empty')}
              </p>
            ) : (
              <ul className="space-y-2">
                {drafts.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      'group relative rounded-lg border p-2.5 transition-colors',
                      currentDraftId === d.id
                        ? 'border-leaf-300 bg-leaf-50'
                        : 'border-leaf-100 hover:border-leaf-200'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onLoadDraft(d)}
                      className="block w-full text-left"
                    >
                      <div className="truncate text-sm font-medium text-ink-800">
                        {d.title || t('common.empty')}
                      </div>
                      <div className="mt-0.5 text-[10px] text-leaf-700/70">
                        {t(`post.types.${d.type}`)} · {new Date(d.savedAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(d.id)}
                      className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 text-leaf-600 hover:text-rose-500"
                      aria-label={t('common.delete')}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4 text-xs text-leaf-700/80">
            <div className="mb-2 font-semibold text-ink-800">{t('editor.tips.title')}</div>
            <ul className="ml-4 list-disc space-y-1">
              <li>{t('editor.tips.item1')}</li>
              <li>{t('editor.tips.item2')}</li>
              <li>{t('editor.tips.item3')}</li>
              <li>{t('editor.tips.item4')}</li>
            </ul>
          </div>
        </div>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink-800 px-4 py-2 text-xs text-white shadow-lg">
          {toast}
        </div>
      )}
    </Shell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-leaf-700/80">{label}</label>
      {children}
    </div>
  );
}

/** 不再用硬编码映射 — 改为在调用处用 t('post.types.<key>') */
function typeLabel(postType: PostType) {
  return postType; // fallback: 返回类型 key 本身,调用处再翻译
}
