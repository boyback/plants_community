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
import { PostContentFields } from "@/components/editor/post-form/PostContentFields";
import type { PostDraft } from "@/components/editor/post-form/types";
import { AlbumImagePickerDialog } from "@/components/editor/AlbumImagePickerDialog";
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
  { type: "event", label: "活动帖", icon: "event" },
];

const visibilityOptions = [
  { value: "public", label: "公开（所有人可见）" },
  { value: "private", label: "仅自己可见" },
];

type AlbumSyncMode = "none" | "new" | "existing";

type MineAlbumOption = {
  id: string;
  title: string;
  isPublic: boolean;
  imageCount: number;
};

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
  const [albumPickerMode, setAlbumPickerMode] = useState<"insert" | "cover" | null>(null);
  const [albumSyncMode, setAlbumSyncMode] = useState<AlbumSyncMode>("none");
  const [albumSyncAlbumId, setAlbumSyncAlbumId] = useState("");
  const [albumSyncTitle, setAlbumSyncTitle] = useState("");
  const [albumSyncDescription, setAlbumSyncDescription] = useState("");
  const [syncCoverAsAlbumCover, setSyncCoverAsAlbumCover] = useState(false);
  const [mineAlbums, setMineAlbums] = useState<MineAlbumOption[]>([]);
  const [loadingMineAlbums, setLoadingMineAlbums] = useState(false);
  const [hasLoadedMineAlbums, setHasLoadedMineAlbums] = useState(false);

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

  useEffect(() => {
    if (albumSyncMode !== "existing" || hasLoadedMineAlbums || loadingMineAlbums) return;
    setLoadingMineAlbums(true);
    api
      .get<{ items: MineAlbumOption[] }>("/api/albums/mine")
      .then((data) => {
        setMineAlbums(data.items);
        setAlbumSyncAlbumId((current) => current || data.items[0]?.id || "");
      })
      .catch((error) => {
        toast.error(error instanceof ApiError ? error.message : "读取晒图相册失败");
      })
      .finally(() => setLoadingMineAlbums(false));
    setHasLoadedMineAlbums(true);
  }, [albumSyncMode, hasLoadedMineAlbums, loadingMineAlbums]);

  const clearValidationError = (key: string) => {
    setValidationErrors((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const clearJournalValidationErrors = () => {
    setValidationErrors((prev) => {
      const next = new Set([...prev].filter((key) => !key.startsWith("journal")));
      return next.size === prev.size ? prev : next;
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

  const hasRichContent = () => countTextFromJson(contentJson) > 0 || contentImages.length > 0;

  const handleAlbumImagesPicked = (urls: string[]) => {
    if (albumPickerMode === "cover") {
      setCover(urls[0] ?? "");
      return;
    }
    if (albumPickerMode === "insert") {
      setContentJson((current: unknown) => appendImagesToRichJson(current, urls));
      clearValidationError(type === "event" ? "eventContent" : "richContent");
    }
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
    if (!genusSlug && !categorySlug && !speciesSlug) errors.add("board");
    if (tags.length === 0) errors.add("tags");
    if (type === "rich" && !hasRichContent()) errors.add("richContent");
    if (type === "short" && !content.trim()) errors.add("shortContent");
    if (type === "help" && !content.trim()) errors.add("helpContent");
    if (type === "video") {
      if (!content.trim()) errors.add("videoContent");
      if (!videoUrl.trim()) errors.add("videoUrl");
    }
    if (type === "vote") {
      if (!content.trim()) errors.add("voteContent");
      if (voteOptions.filter((x) => x.trim()).length < 2) errors.add("voteOptions");
      if (!voteDeadline) errors.add("voteDeadline");
    }
    if (type === "event") {
      if (!hasRichContent()) errors.add("eventContent");
      if (!eventLocation.trim()) errors.add("eventLocation");
      if (!eventStartAt) errors.add("eventStartAt");
    }
    if (type === "journal") {
      if (!speciesSlug) errors.add("journalSpecies");
      if (!journal.subjectName.trim()) errors.add("journalName");
      if (!journal.startDate) errors.add("journalDate");
      if (!journal.entries.length) errors.add("journalEntries");
      journal.entries.forEach((entry, index) => {
        if (isEdit && entry.id) return;
        if (!entry.entryDate) errors.add(`journalEntryDate:${index}`);
        if (!entry.stage) errors.add(`journalEntryStage:${index}`);
        if (entry.stage === "other" && !entry.stageLabel?.trim()) errors.add(`journalEntryStageLabel:${index}`);
        if (entry.images.length === 0) errors.add(`journalEntryImages:${index}`);
        if (!entry.note.trim()) errors.add(`journalEntryNote:${index}`);
      });
    }
    return errors;
  };

  const validate = () => {
    const errors = getRequiredErrors();
    setValidationErrors(errors);
    const message = firstValidationMessage(errors);
    if (message) toast.error(message);
    return errors.size === 0;
  };

  const firstValidationMessage = (errors: Set<string>) => {
    const ordered: Array<[string, string]> = [
      ["title", t("editor.errors.titleRequired")],
      ["type", "请选择帖子类型"],
      ["richContent", "图文帖需要填写正文，或至少插入一张图片"],
      ["shortContent", "纯文字帖需要填写正文内容"],
      ["helpContent", "提问帖需要描述问题现象、环境或已尝试的方法"],
      ["videoContent", "视频帖需要补充一段视频说明"],
      ["videoUrl", t("editor.errors.videoUrlRequired")],
      ["voteContent", "投票帖需要填写投票说明"],
      ["voteOptions", t("editor.errors.voteOptionsMin")],
      ["voteDeadline", "请选择投票截止时间"],
      ["eventContent", "活动帖需要填写活动介绍"],
      ["eventLocation", "请填写活动地点"],
      ["eventStartAt", "请选择活动开始时间"],
      ["journalSpecies", "成长记录需要选择具体品种"],
      ["journalName", "请填写成长记录的植物昵称"],
      ["journalDate", "请选择成长记录的起始日期"],
      ["journalEntries", "请至少添加一条成长记录"],
      ["board", t("editor.chooseBoard")],
      ["tags", "请至少添加一个话题"],
    ];
    const exact = ordered.find(([key]) => errors.has(key));
    if (exact) return exact[1];
    if ([...errors].some((key) => key.startsWith("journalEntryDate:"))) return "请补全成长记录的日期";
    if ([...errors].some((key) => key.startsWith("journalEntryStage:"))) return "请选择成长记录的阶段";
    if ([...errors].some((key) => key.startsWith("journalEntryStageLabel:"))) return "选择其他阶段时，请填写阶段名称";
    if ([...errors].some((key) => key.startsWith("journalEntryImages:"))) return "每条成长记录都需要上传配图";
    if ([...errors].some((key) => key.startsWith("journalEntryNote:"))) return "请填写成长记录的心得";
    return null;
  };

  const submit = async () => {
    if (!validate()) return;
    const isRich = type === "rich" || type === "event";
    const images = Array.from(new Set(isRich ? contentImages : []));
    const syncImages = Array.from(new Set([...(cover ? [cover] : []), ...images, ...getJournalImageUrls(journal)]));
    if (albumSyncMode !== "none") {
      if (syncImages.length === 0) {
        toast.error("当前帖子还没有可同步到晒图广场的图片");
        return;
      }
      if (albumSyncMode === "existing" && !albumSyncAlbumId) {
        toast.error("请选择要追加的晒图相册");
        return;
      }
    }
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
            ...(e.id ? { id: e.id } : {}),
            entryDate: new Date(e.entryDate).toISOString(),
            stage: e.stage || undefined,
            stageLabel: e.stage === "other" ? e.stageLabel?.trim() : undefined,
            note: e.note,
            images: e.images,
          })),
        },
      }),
      ...(albumSyncMode !== "none" && {
        albumSync: {
          mode: albumSyncMode,
          ...(albumSyncMode === "existing" && { albumId: albumSyncAlbumId }),
          ...(albumSyncMode === "new" && {
            title: albumSyncTitle.trim() || undefined,
            description: albumSyncDescription.trim() || undefined,
          }),
          syncCoverAsAlbumCover,
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
      noValidate
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
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-ink-950">{isEdit ? "编辑帖子" : "新建帖子"}</h1>
                <p className="mt-1 text-sm text-ink-500">分享你的多肉种植经验、心得或美图吧</p>
              </div>
              {isEdit && <PostTypeBadge type={type} />}
            </div>

          <div className="flex flex-1 flex-col rounded-xl border border-leaf-100 bg-white p-5 shadow-sm">
            <Form.Field name="type" serverInvalid={validationErrors.has("type")}>
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
            <Form.Field name="title" serverInvalid={validationErrors.has("title")} className="mt-5">
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
            <div className="mt-5">
              <PostContentFields
                type={type}
                t={t}
                content={content}
                validationErrors={validationErrors}
                onClearValidationError={clearValidationError}
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
                onJournalChange={(value) => {
                  setJournal(value);
                  clearJournalValidationErrors();
                }}
              />
            </div>

            {(type === "rich" || type === "event") && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-leaf-100 bg-leaf-50/40 px-3 py-2">
                <button
                  type="button"
                  className="btn-outline h-9 bg-white !px-3 text-sm"
                  onClick={() => setAlbumPickerMode("insert")}
                >
                  <Icon name="image" size={14} />
                  从我的晒图插入图片
                </button>
                <span className="text-xs text-ink-500">只可选择自己的晒图图片，插入后帖子会保留图片地址快照。</span>
              </div>
            )}

            <div ref={settingsRef} className="mt-5 border-t border-solid border-leaf-200 pt-5 scroll-mt-24">
              <PostSettingsCard
                cover={cover}
                onCoverChange={setCover}
                onPickAlbumCover={() => setAlbumPickerMode("cover")}
                boardSelection={{ categorySlug, genusSlug, speciesSlug }}
                onBoardChange={onBoardChange}
                boardInvalid={(validationErrors.has("board") && !categorySlug) || validationErrors.has("journalSpecies")}
                autoSelectFirst={!isEdit}
                visibility={visibility}
                onVisibilityChange={setVisibility}
                tags={tags}
                tagInvalid={validationErrors.has("tags")}
                onTagsChange={onTagChange}
                embedded
              />
              <AlbumSyncSettings
                mode={albumSyncMode}
                onModeChange={setAlbumSyncMode}
                albums={mineAlbums}
                loadingAlbums={loadingMineAlbums}
                albumId={albumSyncAlbumId}
                onAlbumIdChange={setAlbumSyncAlbumId}
                title={albumSyncTitle}
                onTitleChange={setAlbumSyncTitle}
                description={albumSyncDescription}
                onDescriptionChange={setAlbumSyncDescription}
                syncCoverAsAlbumCover={syncCoverAsAlbumCover}
                onSyncCoverAsAlbumCoverChange={setSyncCoverAsAlbumCover}
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

      <AlbumImagePickerDialog
        open={albumPickerMode !== null}
        mode={albumPickerMode ?? "insert"}
        onClose={() => setAlbumPickerMode(null)}
        onConfirm={handleAlbumImagesPicked}
      />

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
  onPickAlbumCover,
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
  onPickAlbumCover: () => void;
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
            <button type="button" className="btn-outline h-9 bg-white !px-3 text-sm" onClick={onPickAlbumCover}>
              <Icon name="image" size={14} />
              从我的晒图设封面
            </button>
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

      </div>
    </section>
  );
}

function AlbumSyncSettings({
  mode,
  onModeChange,
  albums,
  loadingAlbums,
  albumId,
  onAlbumIdChange,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  syncCoverAsAlbumCover,
  onSyncCoverAsAlbumCoverChange,
}: {
  mode: AlbumSyncMode;
  onModeChange: (mode: AlbumSyncMode) => void;
  albums: MineAlbumOption[];
  loadingAlbums: boolean;
  albumId: string;
  onAlbumIdChange: (id: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  syncCoverAsAlbumCover: boolean;
  onSyncCoverAsAlbumCoverChange: (value: boolean) => void;
}) {
  const selectedAlbum = albums.find((album) => album.id === albumId) ?? null;
  const [albumSearch, setAlbumSearch] = useState("");
  const visibleAlbums = albums.filter((album) => {
    const keyword = albumSearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${album.title} ${album.id}`.toLowerCase().includes(keyword);
  });

  return (
    <section className="mt-5 border-t border-leaf-200 pt-5">
      <h2 className="text-base font-bold text-ink-900">同步到晒图广场</h2>
      <div className="mt-4 divide-y divide-leaf-100 border-y border-leaf-100">
        <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
          <div>
            <div className="text-sm font-semibold text-ink-800">同步方式</div>
            <div className="mt-1 text-xs leading-5 text-ink-500">把本次帖子中的图片同步到你的晒图相册。</div>
          </div>
          <div className="space-y-3">
            <div className="inline-grid w-full max-w-[420px] grid-cols-3 gap-1 rounded-lg border border-leaf-200 bg-leaf-50/60 p-1">
              {[
                { value: "none", label: "不同步" },
                { value: "new", label: "新建相册" },
                { value: "existing", label: "追加已有" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onModeChange(option.value as AlbumSyncMode)}
                  className={cn(
                    "h-9 rounded-md px-3 text-sm font-semibold transition",
                    mode === option.value
                      ? "bg-white text-leaf-800 shadow-sm"
                      : "text-ink-500 hover:bg-white/70 hover:text-ink-800",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs leading-5 text-ink-500">
              帖子会保留图片 URL 快照；将来删除相册，不会直接清空帖子里的图片。
            </p>
          </div>
        </div>

        {mode === "new" && (
          <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <div className="text-sm font-semibold text-ink-800">新相册信息</div>
              <div className="mt-1 text-xs leading-5 text-ink-500">标题可留空，系统会按帖子标题生成。</div>
            </div>
            <div className="w-[420px] max-w-full space-y-3">
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="相册标题"
                maxLength={50}
                showCount
              />
              <textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder="相册描述，可选"
                maxLength={500}
                className="input min-h-[86px] w-full resize-y"
              />
            </div>
          </div>
        )}

        {mode === "existing" && (
          <div className="grid gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <div className="text-sm font-semibold text-ink-800">目标相册</div>
              <div className="mt-1 text-xs leading-5 text-ink-500">只能追加到你自己的相册，并自动跳过重复图片。</div>
            </div>
            <div className="space-y-2">
              <Input
                value={albumSearch}
                onChange={(event) => setAlbumSearch(event.target.value)}
                placeholder={loadingAlbums ? "相册加载中..." : "搜索相册"}
                disabled={loadingAlbums || albums.length === 0}
                wrapperClassName="w-[360px] max-w-full"
              />
              {visibleAlbums.length > 0 && (
                <div className="grid max-h-52 w-[420px] max-w-full gap-2 overflow-y-auto rounded-lg border border-leaf-100 bg-leaf-50/40 p-2">
                  {visibleAlbums.map((album) => {
                    const active = album.id === albumId;
                    return (
                      <button
                        key={album.id}
                        type="button"
                        onClick={() => onAlbumIdChange(album.id)}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                          active
                            ? "border-leaf-400 bg-white text-leaf-800 shadow-sm"
                            : "border-transparent bg-white/70 text-ink-700 hover:border-leaf-200 hover:bg-white",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{album.title}</span>
                          <span className="mt-0.5 block text-xs text-ink-400">
                            {album.imageCount} 张{album.isPublic ? "" : " · 私密"}
                          </span>
                        </span>
                        {active && <Icon name="check" size={14} className="text-leaf-700" />}
                      </button>
                    );
                  })}
                </div>
              )}
              {!loadingAlbums && albums.length === 0 && (
                <p className="text-xs text-ink-400">还没有可追加的晒图相册，可以改为新建相册。</p>
              )}
              {!loadingAlbums && albums.length > 0 && visibleAlbums.length === 0 && (
                <p className="text-xs text-ink-400">没有匹配的相册。</p>
              )}
              {selectedAlbum && !selectedAlbum.isPublic && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                  目标相册是私密相册；如果帖子公开发布，图片仍会出现在帖子里。
                </p>
              )}
            </div>
          </div>
        )}

        {mode !== "none" && (
          <label className="grid cursor-pointer gap-3 py-4 md:grid-cols-[150px_minmax(0,1fr)]">
            <div>
              <div className="text-sm font-semibold text-ink-800">相册封面</div>
              <div className="mt-1 text-xs leading-5 text-ink-500">默认用同步图片中的第一张。</div>
            </div>
            <span className="inline-flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={syncCoverAsAlbumCover}
                onChange={(event) => onSyncCoverAsAlbumCoverChange(event.target.checked)}
                className="h-4 w-4 rounded accent-leaf-600"
              />
              同步使用帖子封面作为相册封面
            </span>
          </label>
        )}
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

function appendImagesToRichJson(json: unknown, urls: string[]): unknown {
  const doc = cloneDoc(json);
  const content = Array.isArray(doc.content) ? doc.content : [];
  doc.content = [
    ...content,
    ...urls.map((url) => ({
      type: "image",
      attrs: { src: url },
    })),
    { type: "paragraph" },
  ];
  return doc;
}

function cloneDoc(json: unknown): { type: string; content?: unknown[] } {
  if (json && typeof json === "object" && (json as { type?: string }).type === "doc") {
    return JSON.parse(JSON.stringify(json)) as { type: string; content?: unknown[] };
  }
  return { type: "doc", content: [] };
}

function getJournalImageUrls(journal: JournalDraft): string[] {
  return journal.entries.flatMap((entry) => entry.images ?? []).filter(Boolean);
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
