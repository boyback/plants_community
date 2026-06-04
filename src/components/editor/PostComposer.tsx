"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { PostType } from "@/lib/types";
import { PostPreview } from "@/components/editor/PostPreview";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { UploadField } from "@/components/upload/UploadField";
import { TagSelector } from "@/components/editor/TagSelector";
import { BoardSelect } from "@/components/editor/BoardSelect";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/components/ui/Toast";
import { emptyJournalDraft, type JournalDraft } from "@/components/post/JournalEditor";
import { PostTypeBadge } from "@/components/ui/PostTypeBadge";
import { FieldRow } from "@/components/editor/post-form/FieldRow";
import { PostContentFields } from "@/components/editor/post-form/PostContentFields";
import { DraftSidebar } from "@/components/editor/post-form/DraftSidebar";
import type { PostDraft } from "@/components/editor/post-form/types";
import { cn } from "@/lib/utils";

export interface PostComposerInitialValue {
  id?: string;
  type?: PostType;
  title?: string;
  content?: string;
  contentJson?: unknown;
  categorySlug?: string;
  genusSlug?: string;
  speciesSlug?: string;
  tags?: string[];
  videoUrl?: string;
  cover?: string;
  voteOptions?: string[];
  voteMulti?: boolean;
  voteDeadline?: string;
  voteOptionsLocked?: boolean;
  eventLocation?: string;
  eventStartAt?: string;
  journal?: JournalDraft;
}

interface PostComposerProps {
  mode?: "create" | "edit";
  initialValue?: PostComposerInitialValue;
  drafts?: PostDraft[];
  currentDraftId?: string | null;
  onSaveDraft?: (payload: Record<string, unknown>, title: string, type: PostType) => Promise<string | void>;
  onLoadDraft?: (draft: PostDraft) => void;
  onDeleteDraft?: (id: string) => Promise<void>;
  onDraftsChanged?: () => Promise<void>;
}

const typeOptions: Array<{ type: PostType; label: string; icon: IconName }> = [
  { type: "rich", label: "图文帖子", icon: "image" },
  { type: "short", label: "纯文字", icon: "message" },
  { type: "journal", label: "成长记录", icon: "event" },
  { type: "help", label: "提问帖", icon: "info" },
  { type: "vote", label: "投票帖", icon: "vote" },
  { type: "video", label: "视频", icon: "video" },
];

const contentKit = [
  { label: "图片", icon: "image" as IconName },
  { label: "图库(多图)", icon: "board" as IconName },
  { label: "视频", icon: "video" as IconName },
  { label: "植物卡片", icon: "plants" as IconName },
  { label: "图鉴卡片", icon: "board" as IconName },
  { label: "引用块", icon: "message" as IconName },
  { label: "分割线", icon: "settings" as IconName },
  { label: "代码块", icon: "edit" as IconName },
  { label: "投票", icon: "vote" as IconName },
  { label: "时间轴", icon: "event" as IconName },
  { label: "地理位置", icon: "pin" as IconName },
  { label: "文件附件", icon: "package" as IconName },
];

export function PostComposer({
  mode = "create",
  initialValue,
  drafts = [],
  currentDraftId = null,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  onDraftsChanged,
}: PostComposerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const isEdit = mode === "edit";

  const [type, setType] = useState<PostType>(initialValue?.type ?? "rich");
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [contentJson, setContentJson] = useState<unknown>(
    initialValue?.contentJson ?? (initialValue?.content ? createJsonFromHtml(initialValue.content) : null),
  );
  const [categorySlug, setCategorySlug] = useState(initialValue?.categorySlug ?? "");
  const [genusSlug, setGenusSlug] = useState(initialValue?.genusSlug ?? "");
  const [speciesSlug, setSpeciesSlug] = useState(initialValue?.speciesSlug ?? "");
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [videoUrl, setVideoUrl] = useState(initialValue?.videoUrl ?? "");
  const [cover, setCover] = useState(initialValue?.cover ?? "");
  const [voteOptions, setVoteOptions] = useState<string[]>(initialValue?.voteOptions ?? ["", ""]);
  const [voteMulti, setVoteMulti] = useState(initialValue?.voteMulti ?? false);
  const [voteDeadline, setVoteDeadline] = useState(initialValue?.voteDeadline ?? "");
  const [eventLocation, setEventLocation] = useState(initialValue?.eventLocation ?? "");
  const [eventStartAt, setEventStartAt] = useState(initialValue?.eventStartAt ?? "");
  const [journal, setJournal] = useState<JournalDraft>(() => initialValue?.journal ?? emptyJournalDraft());
  const voteOptionsLocked = isEdit && type === "vote" && initialValue?.voteOptionsLocked === true;
  const [draftId, setDraftId] = useState<string | null>(currentDraftId);
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  const contentImages = useMemo(() => extractImagesFromJson(contentJson), [contentJson]);
  const textCount = useMemo(() => {
    if (type === "rich" || type === "event") return countTextFromJson(contentJson);
    if (type === "journal") return journal.entries.reduce((sum, item) => sum + item.note.length, journal.subjectName.length);
    return content.length;
  }, [content, contentJson, journal, type]);

  const onBoardChange = (selection: { categorySlug: string; genusSlug: string; speciesSlug: string }) => {
    setCategorySlug(selection.categorySlug);
    setGenusSlug(selection.genusSlug);
    setSpeciesSlug(selection.speciesSlug);
    setValidationErrors((prev) => {
      const next = new Set(prev);
      next.delete("board");
      return next;
    });
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
    videoUrl,
    voteOptions,
    voteMulti,
    voteDeadline,
    eventLocation,
    eventStartAt,
    journal,
    cover,
  });

  const hasContent = () => {
    if (type === "rich" || type === "event") {
      const j = contentJson as { content?: unknown[] } | null;
      return !!j && Array.isArray(j.content) && j.content.length > 0;
    }
    return !!content.trim();
  };

  const loadDraftIntoForm = (d: PostDraft) => {
    const p = (d.payload as any) ?? {};
    setType((p.type as PostType) ?? d.type);
    setTitle(p.title ?? d.title ?? "");
    setContent(p.content ?? "");
    setContentJson(p.contentJson ?? null);
    setCategorySlug(p.categorySlug ?? p.boardSlug ?? categorySlug);
    setGenusSlug(p.genusSlug ?? "");
    setSpeciesSlug(p.speciesSlug ?? "");
    setTags(p.tags ?? []);
    setVideoUrl(p.videoUrl ?? "");
    setVoteOptions(p.voteOptions ?? ["", ""]);
    setVoteMulti(!!p.voteMulti);
    setVoteDeadline(p.voteDeadline ?? "");
    setEventLocation(p.eventLocation ?? "");
    setEventStartAt(p.eventStartAt ?? "");
    if (p.journal) setJournal(p.journal as JournalDraft);
    setCover(p.cover ?? "");
    setDraftId(d.id);
    onLoadDraft?.(d);
  };

  const saveDraft = async () => {
    if (!onSaveDraft) return;
    if (!title.trim() && !hasContent()) {
      toast.error(t("editor.errors.contentRequired"));
      return;
    }
    try {
      const id = await onSaveDraft({ id: draftId ?? undefined, ...buildPayload() }, title || "(untitled)", type);
      if (typeof id === "string") setDraftId(id);
      await onDraftsChanged?.();
      toast.success(t("editor.draftSaved"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.retry"));
    }
  };

  const validate = () => {
    const errors = new Set<string>();
    if (!title.trim()) {
      errors.add("title");
      toast.error(t("editor.errors.titleRequired"));
    }
    if (!genusSlug && !categorySlug && !speciesSlug) {
      errors.add("board");
      toast.error(t("editor.chooseBoard"));
    }
    if ((type === "rich" || type === "event") && !hasContent()) {
      errors.add("content");
      toast.error(t("editor.errors.contentRequired"));
    }
    if ((type === "short" || type === "help") && !content.trim()) {
      errors.add("content");
      toast.error(t("editor.errors.contentRequired"));
    }
    if (type === "video" && !videoUrl.trim()) {
      errors.add("content");
      toast.error(t("editor.errors.videoUrlRequired"));
    }
    if (type === "vote" && voteOptions.filter((x) => x.trim()).length < 2) {
      errors.add("content");
      toast.error(t("editor.errors.voteOptionsMin"));
    }
    if (type === "vote" && !voteDeadline) {
      errors.add("content");
      toast.error(t("editor.voteDeadline"));
    }
    if (type === "event" && (!eventLocation.trim() || !eventStartAt)) {
      errors.add("content");
      toast.error(t("editor.event"));
    }
    if (type === "journal") {
      if (!journal.subjectName.trim()) errors.add("content");
      if (!journal.startDate) errors.add("content");
      if (!journal.entries.length) errors.add("content");
      if (journal.entries.find((e) => !e.entryDate)) errors.add("content");
      if (errors.has("content")) toast.error(t("editor.errors.contentRequired"));
    }
    setValidationErrors(errors);
    return errors.size === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    const isRich = type === "rich" || type === "event";
    const images = Array.from(new Set(isRich ? contentImages : []));
    const boardPayload = speciesSlug ? { speciesSlug } : genusSlug ? { genusSlug } : { categorySlug };
    const body: any = {
      ...(isEdit ? {} : { type }),
      ...boardPayload,
      title,
      ...(isRich ? { contentJson } : { content }),
      tags,
      ...(cover && { cover }),
      ...(images.length > 0 && { images }),
      ...(type === "video" && { videoUrl }),
      ...(type === "vote" && {
        vote: {
          question: title,
          options: voteOptions.filter((x) => x.trim()),
          multi: voteMulti,
          deadline: new Date(voteDeadline).toISOString(),
        },
      }),
      ...(type === "event" && {
        event: {
          location: eventLocation,
          startAt: new Date(eventStartAt).toISOString(),
          endAt: new Date(eventStartAt).toISOString(),
        },
      }),
      ...(type === "journal" && {
        journal: {
          subjectName: journal.subjectName.trim(),
          startDate: new Date(journal.startDate).toISOString(),
          entries: journal.entries.map((e) => ({
            entryDate: new Date(e.entryDate).toISOString(),
            stage: e.stage,
            note: e.note,
            images: e.images,
          })),
        },
      }),
    };

    setSubmitting(true);
    try {
      if (isEdit && initialValue?.id) {
        const result = await api.patch<{ ok: boolean; needsReview: boolean }>(`/api/posts/${initialValue.id}`, body);
        toast.success(result.needsReview ? "已保存，等待审核" : "已保存");
        setTimeout(() => router.push(`/post/${initialValue.id}`), 800);
        return;
      }

      const created = await api.post<{ id: string }>("/api/posts", body);
      if (draftId) await api.delete(`/api/drafts/${draftId}`).catch(() => null);
      toast.success(t("editor.submit"));
      setTimeout(() => router.push(`/post/${created.id}`), 800);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("error.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="editor-workspace grid grid-cols-1 gap-4 2xl:grid-cols-[minmax(680px,1fr)_300px_330px]">
      <section className="min-w-0 space-y-4">
        <header className="px-1">
          <div className="flex items-center gap-2 text-sm text-ink-500">
            <span>社区</span>
            <span>/</span>
            <span>{isEdit ? "编辑帖子" : "发布帖子"}</span>
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ink-950">{isEdit ? "编辑帖子" : "发布新帖子"}</h1>
              <p className="mt-1 text-sm text-ink-500">分享你的多肉种植经验、心得或美图吧</p>
            </div>
            {isEdit && <PostTypeBadge type={type} />}
          </div>
        </header>

        <div className="rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <div className="mb-1.5 block text-sm font-semibold text-ink-800">
                选择板块 <span className="text-rose-500">*</span>
              </div>
              <BoardSelect
                value={{ categorySlug, genusSlug, speciesSlug }}
                onChange={onBoardChange}
                invalid={validationErrors.has("board") && !categorySlug}
                autoSelectFirst={!isEdit}
              />
            </div>

            <FieldRow label={<><span className="text-rose-500">*</span> 帖子标题</>}>
              <Input
                className="!h-11 !text-base font-medium leading-6"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="银冠玉养护记录 | 从单头到爆仔的 3 年变化"
                maxLength={50}
                showCount
              />
            </FieldRow>
          </div>

          <div className="mt-5">
            <div className="mb-2 block text-sm font-semibold text-ink-800">帖子类型</div>
            <EditorTypePicker type={type} isEdit={isEdit} onChange={setType} />
          </div>

          <div className="mt-5">
            <PostContentFields
              type={type}
              t={t}
              content={content}
              onContentChange={setContent}
              contentJson={contentJson}
              onContentJsonChange={setContentJson}
              videoUrl={videoUrl}
              onVideoUrlChange={setVideoUrl}
              voteOptions={voteOptions}
              onVoteOptionsChange={setVoteOptions}
              voteMulti={voteMulti}
              onVoteMultiChange={setVoteMulti}
              voteDeadline={voteDeadline}
              onVoteDeadlineChange={setVoteDeadline}
              voteOptionsLocked={voteOptionsLocked}
              eventLocation={eventLocation}
              onEventLocationChange={setEventLocation}
              eventStartAt={eventStartAt}
              onEventStartAtChange={setEventStartAt}
              journal={journal}
              onJournalChange={setJournal}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-leaf-100 pt-3 text-xs text-ink-500">
            <span>字数统计：{textCount}</span>
            <span className="inline-flex items-center gap-1 text-leaf-700">
              <Icon name="check" size={13} />
              已自动保存 14:30:25
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {!isEdit && onSaveDraft ? (
            <button type="button" onClick={saveDraft} className="btn-outline h-12 justify-center bg-white">
              <Icon name="edit" size={16} />
              保存草稿
            </button>
          ) : initialValue?.id ? (
            <Link href={`/post/${initialValue.id}`} className="btn-outline h-12 justify-center bg-white">
              取消
            </Link>
          ) : (
            <button type="button" className="btn-outline h-12 justify-center bg-white" disabled>
              保存草稿
            </button>
          )}
          <button type="button" className="btn-outline h-12 justify-center bg-white">
            <Icon name="eye" size={16} />
            预览
          </button>
          <button type="button" onClick={submit} disabled={submitting} className="btn-primary h-12 justify-center">
            <Icon name="send" size={16} />
            {submitting ? t("editor.submitting") : isEdit ? "保存" : "发布帖子"}
          </button>
        </div>
      </section>

      <aside className="min-w-0 space-y-4 2xl:sticky 2xl:top-[84px] 2xl:self-start">
        <ContentKitCard />
        {!isEdit && (
          <DraftSidebar
            drafts={drafts}
            draftId={draftId}
            t={t}
            onLoadDraft={loadDraftIntoForm}
            onDeleteDraft={async (draft) => {
              await onDeleteDraft?.(draft.id);
              if (draftId === draft.id) setDraftId(null);
            }}
          />
        )}
        <PostSettingsCard cover={cover} onCoverChange={setCover} tags={tags} onTagsChange={setTags} />
      </aside>

      <aside className="min-w-0 space-y-4 2xl:sticky 2xl:top-[84px] 2xl:self-start">
        <PostPreview
          type={type}
          title={title}
          content={content}
          contentJson={contentJson}
          images={contentImages}
          videoUrl={videoUrl}
          tags={tags}
          user={user}
          voteOptions={voteOptions}
          voteMulti={voteMulti}
          voteDeadline={voteDeadline}
          eventLocation={eventLocation}
          eventStartAt={eventStartAt}
          journal={journal}
          cover={cover}
        />
        <EditorTipsCard />
      </aside>
    </div>
  );
}

function EditorTypePicker({
  type,
  isEdit,
  onChange,
}: {
  type: PostType;
  isEdit: boolean;
  onChange: (type: PostType) => void;
}) {
  if (isEdit) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-leaf-100 bg-leaf-50/50 px-3 py-2 text-sm text-ink-700">
        <PostTypeBadge type={type} />
        <span className="text-xs text-ink-500">编辑时不能修改类型</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {typeOptions.map((item) => {
        const active = type === item.type;
        return (
          <button
            key={item.type}
            type="button"
            onClick={() => onChange(item.type)}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
              active
                ? "border-leaf-500 bg-leaf-50 text-leaf-800 shadow-sm"
                : "border-leaf-100 bg-white text-ink-700 hover:border-leaf-300 hover:bg-leaf-50/60",
            )}
          >
            <Icon name={item.icon} size={15} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function ContentKitCard() {
  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink-900">内容组件</h2>
      <p className="mt-1 text-xs leading-5 text-ink-500">富文本按钮仍在正文工具栏中，这里保留常用组件入口。</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {contentKit.map((item) => (
          <button
            key={item.label}
            type="button"
            className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-leaf-100 bg-leaf-50/40 px-2 text-xs font-semibold text-ink-700 transition hover:border-leaf-300 hover:bg-leaf-50"
            onClick={() => toast.success("请使用正文上方富文本工具栏插入或编辑内容")}
          >
            <Icon name={item.icon} size={14} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PostSettingsCard({
  cover,
  onCoverChange,
  tags,
  onTagsChange,
}: {
  cover: string;
  onCoverChange: (cover: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}) {
  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink-900">帖子设置</h2>
      <div className="mt-4 space-y-4">
        <div>
          <div className="mb-2 text-sm font-semibold text-ink-800">封面图</div>
          <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3">
            <UploadField
              kind="image"
              value={cover ? [cover] : []}
              onChange={(arr) => onCoverChange(arr[0] ?? "")}
              max={1}
              simpleMode
              className="w-full"
              gridClassName="!p-0"
              itemClassName="h-[76px] rounded-lg bg-leaf-50"
              itemImageClassName="object-cover"
            />
            <div className="min-w-0 text-xs leading-5 text-ink-500">
              <div className="font-semibold text-ink-700">更换封面</div>
              <div>建议尺寸 16:9，支持 JPG/PNG</div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-ink-800">可见范围</div>
          <select className="h-10 w-full rounded-lg border border-leaf-100 bg-white px-3 text-sm text-ink-700 outline-none focus:border-leaf-300 focus:ring-4 focus:ring-leaf-100/70">
            <option>公开（所有人可见）</option>
            <option>仅自己可见</option>
          </select>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-ink-800">标签</div>
          <TagSelector value={tags} onChange={onTagsChange} max={6} />
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-ink-800">参与设置</div>
          <div className="space-y-2 text-sm text-ink-700">
            <CheckLine label="允许评论" />
            <CheckLine label="允许点赞" />
            <CheckLine label="允许收藏" />
          </div>
        </div>
      </div>
    </section>
  );
}

function CheckLine({ label }: { label: string }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked readOnly className="h-4 w-4 rounded accent-leaf-600" />
      {label}
    </label>
  );
}

function EditorTipsCard() {
  const tips = [
    "使用小标题（H2/H3）让内容结构更清晰",
    "图片建议宽度不超过 1200px",
    "善用植物卡片关联图鉴，获得更多曝光",
    "添加标签能让更多同好看到你的内容",
  ];

  return (
    <section className="rounded-xl border border-leaf-100 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-ink-900">编辑小贴士</h2>
      <ul className="mt-3 space-y-2 text-xs leading-5 text-ink-600">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-leaf-600" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 text-xs font-semibold text-leaf-700">了解更多创作指南 →</div>
    </section>
  );
}

function extractImagesFromJson(json: unknown): string[] {
  const images: string[] = [];
  const traverse = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: { src?: string } | null;
      content?: unknown[];
    };
    if (n.type === "image" && typeof n.attrs?.src === "string" && n.attrs.src) {
      images.push(n.attrs.src);
    }
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return images;
}

function countTextFromJson(json: unknown): number {
  let count = 0;
  const traverse = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === "string") count += n.text.length;
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return count;
}

function createJsonFromHtml(html: string): unknown {
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}
