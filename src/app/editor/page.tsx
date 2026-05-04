'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { PostType, Board } from '@/lib/types';
import { Shell } from '@/components/layout/Shell';
import { TypePicker } from '@/components/post/TypePicker';
import { Icon } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/client-api';

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

  const [boards, setBoards] = useState<Board[]>([]);
  const [type, setType] = useState<PostType>('rich');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [boardSlug, setBoardSlug] = useState(searchParams.get('board') ?? '');
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

  // 拉板块
  useEffect(() => {
    api.get<Board[]>('/api/boards').then((list) => {
      setBoards(list);
      if (!boardSlug && list[0]) setBoardSlug(list[0].slug);
    }).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    boardSlug,
    tags,
    images,
    videoUrl,
    voteOptions,
    voteMulti,
    voteDeadline,
    eventLocation,
    eventStartAt,
  });

  const onSaveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      showToast('草稿内容不能为空');
      return;
    }
    try {
      const res = await api.post<{ id: string; savedAt: string }>('/api/drafts', {
        id: currentDraftId ?? undefined,
        title: title || '(未命名)',
        type,
        payload: buildPayload(),
      });
      setCurrentDraftId(res.id);
      await loadDrafts();
      showToast('草稿已保存 💾');
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '保存失败');
    }
  };

  const onLoadDraft = (d: Draft) => {
    const p = (d.payload as any) ?? {};
    setType((p.type as PostType) ?? d.type);
    setTitle(p.title ?? d.title ?? '');
    setContent(p.content ?? '');
    setBoardSlug(p.boardSlug ?? boardSlug);
    setTags(p.tags ?? []);
    setImages(p.images ?? []);
    setVideoUrl(p.videoUrl ?? '');
    setVoteOptions(p.voteOptions ?? ['', '']);
    setVoteMulti(!!p.voteMulti);
    setVoteDeadline(p.voteDeadline ?? '');
    setEventLocation(p.eventLocation ?? '');
    setEventStartAt(p.eventStartAt ?? '');
    setCurrentDraftId(d.id);
    showToast('草稿已载入');
  };

  const onDeleteDraft = async (id: string) => {
    await api.delete(`/api/drafts/${id}`).catch(() => null);
    if (currentDraftId === id) setCurrentDraftId(null);
    await loadDrafts();
  };

  const onPublish = async () => {
    if (!title.trim()) return showToast('请输入标题');
    if (type === 'short' && !content.trim()) return showToast('请填写内容');
    if (type === 'rich' && !content.trim()) return showToast('请填写正文');
    if (type === 'video' && !videoUrl.trim()) return showToast('请填写视频链接');
    if (type === 'vote' && voteOptions.filter((x) => x.trim()).length < 2)
      return showToast('至少要有 2 个投票选项');
    if (type === 'vote' && !voteDeadline)
      return showToast('请选择投票截止时间');
    if (type === 'event' && (!eventLocation.trim() || !eventStartAt))
      return showToast('请填写活动地点和时间');

    setSubmitting(true);
    try {
      const body: any = {
        type,
        boardSlug,
        title,
        content,
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
      showToast('🎉 发布成功!正在跳转...');
      setTimeout(() => router.push(`/post/${created.id}`), 800);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user) {
    return (
      <Shell>
        <div className="card mx-auto max-w-md p-10 text-center">
          <div className="text-4xl">✍️</div>
          <div className="mt-3 text-lg font-semibold">登录后才能发帖</div>
          <p className="mt-1 text-xs text-leaf-700/70">
            和所有肉友一起分享你的养肉心得吧
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/login?redirect=/editor" className="btn-primary">
              去登录
            </Link>
            <Link href="/register" className="btn-outline">
              注册
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
            <h1 className="mb-4 text-xl font-semibold">发布新帖</h1>
            <div className="mb-5">
              <div className="mb-2 text-xs font-medium text-leaf-700/80">帖子类型</div>
              <TypePicker value={type} onChange={setType} />
            </div>

            <div className="space-y-4">
              <Row label="板块">
                <select
                  value={boardSlug}
                  onChange={(e) => setBoardSlug(e.target.value)}
                  className="input"
                >
                  {boards.map((b) => (
                    <option key={b.id} value={b.slug}>
                      {b.icon} {b.name}
                    </option>
                  ))}
                </select>
              </Row>

              <Row label="标题">
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="一个吸引人的标题..."
                  maxLength={60}
                />
                <div className="mt-1 text-right text-[11px] text-leaf-700/60">
                  {title.length} / 60
                </div>
              </Row>

              {type === 'rich' && (
                <Row label="正文 (支持 HTML 标签)">
                  <textarea
                    className="input min-h-[260px] font-mono text-sm"
                    placeholder="<p>来写点什么吧...</p>&#10;支持 &lt;b&gt;加粗&lt;/b&gt;、&lt;ol&gt;列表&lt;/ol&gt;、&lt;blockquote&gt;引用&lt;/blockquote&gt;..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </Row>
              )}

              {type === 'short' && (
                <Row label="正文">
                  <textarea
                    className="input min-h-[140px]"
                    placeholder="简短地说两句..."
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
                  <Row label="视频链接">
                    <input
                      className="input"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://... (mp4 或 hls)"
                    />
                  </Row>
                  <Row label="视频描述">
                    <textarea
                      className="input min-h-[100px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="对视频做一些说明..."
                    />
                  </Row>
                </>
              )}

              {type === 'vote' && (
                <>
                  <Row label="投票说明">
                    <textarea
                      className="input min-h-[80px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="为什么发起这个投票?"
                    />
                  </Row>
                  <Row label="投票选项">
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
                            placeholder={`选项 ${i + 1}`}
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
                          添加选项
                        </button>
                      )}
                    </div>
                  </Row>
                  <div className="grid grid-cols-2 gap-4">
                    <Row label="投票类型">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={voteMulti}
                          onChange={(e) => setVoteMulti(e.target.checked)}
                          className="h-4 w-4 accent-leaf-500"
                        />
                        允许多选
                      </label>
                    </Row>
                    <Row label="截止时间">
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
                  <Row label="活动描述">
                    <textarea
                      className="input min-h-[140px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="介绍一下这次活动..."
                    />
                  </Row>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Row label="活动地点">
                      <input
                        className="input"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="如:北京朝阳区某咖啡馆"
                      />
                    </Row>
                    <Row label="开始时间">
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

              <Row label="图片(URL,回车添加)">
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
                      images.length >= 9 ? '最多 9 张' : '粘贴图片 URL,回车添加'
                    }
                    disabled={images.length >= 9}
                  />
                </div>
              </Row>

              <Row label="标签 (回车添加)">
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-leaf-200 bg-white p-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-xs text-leaf-700"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((x) => x !== t))}
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
                    placeholder={tags.length >= 6 ? '最多 6 个' : '输入标签后回车'}
                    disabled={tags.length >= 6}
                  />
                </div>
              </Row>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-leaf-100 pt-4">
              <div className="text-xs text-leaf-700/70">
                {currentDraftId ? '正在编辑草稿' : '新帖子'}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onSaveDraft} className="btn-outline">
                  <Icon name="edit" size={14} />
                  保存草稿
                </button>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={submitting}
                  className="btn-primary"
                >
                  <Icon name="check" size={14} />
                  {submitting ? '发布中...' : '发布'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-ink-800">📦 草稿箱</div>
              <span className="text-[11px] text-leaf-700/70">{drafts.length} 份</span>
            </div>
            {drafts.length === 0 ? (
              <p className="text-center text-xs text-leaf-700/60 py-4">
                暂无草稿
                <br />
                写到一半时可随时保存
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
                        {d.title || '(无标题)'}
                      </div>
                      <div className="mt-0.5 text-[10px] text-leaf-700/70">
                        {typeLabel(d.type)} · {new Date(d.savedAt).toLocaleString()}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(d.id)}
                      className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 text-leaf-600 hover:text-rose-500"
                      aria-label="删除草稿"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-4 text-xs text-leaf-700/80">
            <div className="mb-2 font-semibold text-ink-800">💡 发帖小贴士</div>
            <ul className="ml-4 list-disc space-y-1">
              <li>标题清晰,正文条理</li>
              <li>配图请提供清晰大图</li>
              <li>勿发广告,严禁违法内容</li>
              <li>合理打 #标签# 便于检索</li>
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

function typeLabel(t: PostType) {
  return { rich: '富文本', short: '短内容', vote: '投票', video: '视频', event: 'EVENT' }[t];
}
