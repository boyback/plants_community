"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "radix-ui";
import type { PostType } from "@/lib/types";
import { PostPreview } from "@/components/editor/PostPreview";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { UploadField } from "@/components/upload/UploadField";
import { TagSelector } from "@/components/editor/TagSelector";
import { BoardSelect, type BoardSelection } from "@/components/editor/BoardSelect";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/components/ui/Toast";
import { emptyJournalDraft, type JournalDraft } from "@/components/post/JournalEditor";
import { PostTypeBadge } from "@/components/ui/PostTypeBadge";
import { FieldRow } from "@/components/editor/post-form/FieldRow";
import { PostContentFields } from "@/components/editor/post-form/PostContentFields";
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

const visibilityOptions = [
  { value: "public", label: "公开（所有人可见）" },
  { value: "private", label: "仅自己可见" },
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
  const [boardLabel, setBoardLabel] = useState("");
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [videoUrl, setVideoUrl] = useState(initialValue?.videoUrl ?? "");
  const [cover, setCover] = useState(initialValue?.cover ?? "");
  const [visibility, setVisibility] = useState("public");
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
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isAtPageBottom, setIsAtPageBottom] = useState(false);

  const contentImages = useMemo(() => extractImagesFromJson(contentJson), [contentJson]);
  const textCount = useMemo(() => {
    if (type === "rich" || type === "event") return countTextFromJson(contentJson);
    if (type === "journal") return journal.entries.reduce((sum, item) => sum + item.note.length, journal.subjectName.length);
    return content.length;
  }, [content, contentJson, journal, type]);
  const visibilityLabel = useMemo(
    () => visibilityOptions.find((option) => option.value === visibility)?.label ?? "公开（所有人可见）",
    [visibility],
  );

  useEffect(() => {
    const updateBottomState = () => {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - window.scrollY - window.innerHeight;
      setIsAtPageBottom(remaining <= 24);
    };
    updateBottomState();
    window.addEventListener("scroll", updateBottomState, { passive: true });
    window.addEventListener("resize", updateBottomState);
    return () => {
      window.removeEventListener("scroll", updateBottomState);
      window.removeEventListener("resize", updateBottomState);
    };
  }, []);

  const clearValidationError = (key: string) => {
    setValidationErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const onBoardChange = (selection: BoardSelection) => {
    setCategorySlug(selection.categorySlug);
    setGenusSlug(selection.genusSlug);
    setSpeciesSlug(selection.speciesSlug);
    setBoardLabel(selection.label ?? "");
    clearValidationError("board");
  };

  const onTagChange = (nextTags: string[]) => {
    setTags(nextTags);
    if (nextTags.length > 0) clearValidationError("tags");
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
    setBoardLabel(p.boardLabel ?? "");
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
    try {
      const id = await onSaveDraft({ id: draftId ?? undefined, ...buildPayload() }, title || "(untitled)", type);
      if (typeof id === "string") setDraftId(id);
      await onDraftsChanged?.();
      toast.success(t("editor.draftSaved"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t("common.retry"));
    }
  };

  const getRequiredErrors = () => {
    const errors = new Set<string>();
    if (!title.trim()) errors.add("title");
    if (!type) errors.add("type");
    if (!hasContent()) errors.add("content");
    if (!genusSlug && !categorySlug && !speciesSlug) errors.add("board");
    if (tags.length === 0) errors.add("tags");
    return errors;
  };

  const validate = () => {
    const errors = getRequiredErrors();
    if (errors.has("title")) {
      toast.error(t("editor.errors.titleRequired"));
    }
    if (errors.has("board")) {
      toast.error(t("editor.chooseBoard"));
    }
    if (errors.has("content")) {
      toast.error(t("editor.errors.contentRequired"));
    }
    if (errors.has("tags")) {
      toast.error("请至少添加一个话题");
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

  const handlePrimaryBottomAction = () => {
    if (isAtPageBottom) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Form.Root
      onInvalidCapture={() => setValidationErrors(getRequiredErrors())}
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div
        className={cn(
          "editor-workspace grid grid-cols-1 gap-4 pb-36 lg:pb-24",
          isEdit
            ? "2xl:grid-cols-[minmax(740px,1fr)_330px]"
            : "2xl:grid-cols-[minmax(740px,1fr)_330px]",
        )}
      >
        <section className="flex min-h-[calc(100dvh-221px)] min-w-0 flex-col gap-4 lg:min-h-[calc(100dvh-157px)]">
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

          <div className="flex flex-1 flex-col rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
            <Form.Field name="title" serverInvalid={validationErrors.has("title")}>
              <Form.Label className="mb-1.5 block text-sm font-semibold text-ink-800">
                <span className="text-rose-500">*</span> 帖子标题
              </Form.Label>
              <Form.Control asChild>
                <Input
                  required
                  value={title}
                  error={validationErrors.has("title")}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) clearValidationError("title");
                  }}
                  placeholder="银冠玉养护记录 | 从单头到爆仔的 3 年变化"
                  maxLength={50}
                  showCount
                />
              </Form.Control>
              <Form.Message
                match="valueMissing"
                forceMatch={validationErrors.has("title")}
                className="mt-1.5 block text-xs text-rose-600"
              >
                请输入帖子标题
              </Form.Message>
            </Form.Field>

            <Form.Field name="type" serverInvalid={validationErrors.has("type")} className="mt-5">
              <Form.Label className="mb-2 block text-sm font-semibold text-ink-800">
                <span className="text-rose-500">*</span> 帖子类型
              </Form.Label>
              <Form.Control
                value={type}
                required
                readOnly
                tabIndex={-1}
                aria-hidden
                className="sr-only"
              />
              <EditorTypePicker
                type={type}
                isEdit={isEdit}
                invalid={validationErrors.has("type")}
                onChange={(nextType) => {
                  setType(nextType);
                  clearValidationError("type");
                }}
              />
              <Form.Message
                match="valueMissing"
                forceMatch={validationErrors.has("type")}
                className="mt-1.5 block text-xs text-rose-600"
              >
                请选择帖子类型
              </Form.Message>
            </Form.Field>

            <Form.Field name="content" serverInvalid={validationErrors.has("content")} className="mt-5">
              <Form.Control
                value={hasContent() ? "ok" : ""}
                required
                readOnly
                tabIndex={-1}
                aria-hidden
                className="sr-only"
              />
              <PostContentFields
                type={type}
                t={t}
                content={content}
                invalid={validationErrors.has("content")}
                onContentChange={(value) => {
                  setContent(value);
                  if (value.trim()) clearValidationError("content");
                }}
                contentJson={contentJson}
                onContentJsonChange={(value) => {
                  setContentJson(value);
                  clearValidationError("content");
                }}
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
                onJournalChange={(value) => {
                  setJournal(value);
                  clearValidationError("content");
                }}
              />
              <Form.Message
                match="valueMissing"
                forceMatch={validationErrors.has("content")}
                className="mt-1.5 block text-xs text-rose-600"
              >
                请输入正文内容
              </Form.Message>
            </Form.Field>

            <div ref={settingsRef} className="mt-5 border-t border-solid border-leaf-200 pt-5 scroll-mt-24">
              <PostSettingsCard
                cover={cover}
                onCoverChange={setCover}
                boardSelection={{ categorySlug, genusSlug, speciesSlug }}
                onBoardChange={onBoardChange}
                boardInvalid={validationErrors.has("board") && !categorySlug}
                autoSelectFirst={!isEdit}
                visibility={visibility}
                onVisibilityChange={setVisibility}
                tags={tags}
                tagInvalid={validationErrors.has("tags")}
                onTagsChange={onTagChange}
                embedded
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
        </section>

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
            boardLabel={boardLabel}
            visibilityLabel={visibilityLabel}
            voteOptions={voteOptions}
            voteMulti={voteMulti}
            voteDeadline={voteDeadline}
            eventLocation={eventLocation}
            eventStartAt={eventStartAt}
            journal={journal}
            cover={cover}
          />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-leaf-100 bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:bottom-0">
        <div
          className={cn(
            "mx-auto grid w-full max-w-[1180px] gap-4 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:px-6",
            isEdit
              ? "2xl:grid-cols-[minmax(740px,1fr)_330px]"
              : "2xl:grid-cols-[minmax(740px,1fr)_330px]",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrimaryBottomAction}
              className="btn-outline h-10 justify-center bg-white !px-3 text-sm"
            >
              <Icon
                name={isAtPageBottom ? "arrow-right" : "settings"}
                size={14}
                className={isAtPageBottom ? "-rotate-90" : undefined}
              />
              {isAtPageBottom ? "回到顶部" : "帖子设置"}
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {!isEdit && onSaveDraft ? (
                <button type="button" onClick={saveDraft} className="btn-outline h-10 justify-center bg-white !px-3 text-sm">
                  <Icon name="edit" size={14} />
                  保存草稿
                </button>
              ) : initialValue?.id ? (
                <Link href={`/post/${initialValue.id}`} className="btn-outline h-10 justify-center bg-white !px-3 text-sm">
                  取消
                </Link>
              ) : (
                <button type="button" className="btn-outline h-10 justify-center bg-white !px-3 text-sm" disabled>
                  保存草稿
                </button>
              )}
              <button type="button" className="btn-outline h-10 justify-center bg-white !px-3 text-sm">
                <Icon name="eye" size={14} />
                预览
              </button>
              <Form.Submit disabled={submitting} className="btn-primary h-10 justify-center !px-3 text-sm">
                <Icon name="send" size={14} />
                {submitting ? t("editor.submitting") : isEdit ? "保存" : "发布帖子"}
              </Form.Submit>
            </div>
          </div>
        </div>
      </div>
    </Form.Root>
  );
}

function EditorTypePicker({
  type,
  isEdit,
  invalid,
  onChange,
}: {
  type: PostType;
  isEdit: boolean;
  invalid?: boolean;
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
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6", invalid && "rounded-lg ring-2 ring-rose-100")}>
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

function PostSettingsCard({
  cover,
  onCoverChange,
  boardSelection,
  onBoardChange,
  boardInvalid,
  autoSelectFirst,
  visibility,
  onVisibilityChange,
  tags,
  tagInvalid,
  onTagsChange,
  embedded = false,
}: {
  cover: string;
  onCoverChange: (cover: string) => void;
  boardSelection: BoardSelection;
  onBoardChange: (selection: BoardSelection) => void;
  boardInvalid: boolean;
  autoSelectFirst: boolean;
  visibility: string;
  onVisibilityChange: (visibility: string) => void;
  tags: string[];
  tagInvalid: boolean;
  onTagsChange: (tags: string[]) => void;
  embedded?: boolean;
}) {
  return (
    <section className={cn(!embedded && "rounded-xl border border-leaf-100 bg-white p-4 shadow-sm")}>
      <h2 className="text-base font-bold text-ink-900">帖子设置</h2>
      <div className="mt-4 divide-y divide-leaf-100 border-y border-leaf-100">
        <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <div className="text-sm font-semibold text-ink-800">封面图</div>
            <div className="mt-1 text-xs leading-5 text-ink-500">用于列表和分享预览。</div>
          </div>
          <div className="flex min-w-0 flex-col items-start gap-2">
            <UploadField
              kind="image"
              value={cover ? [cover] : []}
              onChange={(arr) => onCoverChange(arr[0] ?? "")}
              max={1}
              simpleMode
              className="w-[270px] max-w-full"
              gridClassName="!p-0"
              itemClassName="aspect-video rounded-lg bg-leaf-50"
              itemImageClassName="object-cover"
            />
            <div className="text-xs leading-5 text-ink-500">
              <div className="font-semibold text-ink-700">更换封面</div>
              <div>建议尺寸 16:9，支持 JPG/PNG</div>
            </div>
          </div>
        </div>

        <Form.Field name="board" serverInvalid={boardInvalid} className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <Form.Label className="text-sm font-semibold text-ink-800"><span className="text-rose-500">*</span> 板块</Form.Label>
            <div className="mt-1 text-xs leading-5 text-ink-500">选择内容归属的科、属或品种。</div>
          </div>
          <div className="w-[300px] max-w-full">
            <Form.Control
              value={[boardSelection.categorySlug, boardSelection.genusSlug, boardSelection.speciesSlug].filter(Boolean).join("/")}
              required
              readOnly
              tabIndex={-1}
              aria-hidden
              className="sr-only"
            />
            <BoardSelect
              value={boardSelection}
              onChange={onBoardChange}
              invalid={boardInvalid}
              autoSelectFirst={autoSelectFirst}
            />
            <Form.Message
              match="valueMissing"
              forceMatch={boardInvalid}
              className="mt-1.5 block text-xs text-rose-600"
            >
              请选择板块
            </Form.Message>
          </div>
        </Form.Field>

        <Form.Field name="tags" serverInvalid={tagInvalid} className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <Form.Label className="text-sm font-semibold text-ink-800"><span className="text-rose-500">*</span> 话题</Form.Label>
            <div className="mt-1 text-xs leading-5 text-ink-500">最多 6 个，帮助同好发现内容。</div>
          </div>
          <div>
            <Form.Control
              value={tags.join(",")}
              required
              readOnly
              tabIndex={-1}
              aria-hidden
              className="sr-only"
            />
            <TagSelector
              className="w-[300px] max-w-full"
              controlClassName={tagInvalid ? "border-rose-300 bg-rose-50/30" : undefined}
              value={tags}
              onChange={onTagsChange}
              max={6}
            />
            <Form.Message
              match="valueMissing"
              forceMatch={tagInvalid}
              className="mt-1.5 block text-xs text-rose-600"
            >
              请至少添加一个话题
            </Form.Message>
          </div>
        </Form.Field>

        <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <div className="text-sm font-semibold text-ink-800">可见范围</div>
            <div className="mt-1 text-xs leading-5 text-ink-500">控制帖子发布后的访问权限。</div>
          </div>
          <Select
            value={visibility}
            onValueChange={onVisibilityChange}
            options={visibilityOptions}
            wrapperClassName="w-[300px] max-w-full"
          />
        </div>

        <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <div className="text-sm font-semibold text-ink-800">参与设置</div>
            <div className="mt-1 text-xs leading-5 text-ink-500">控制互动入口。</div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-700">
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
