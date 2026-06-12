"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Form } from "radix-ui";
import type { Board, Post, PostType, User } from "@/lib/types";
import { PostCard } from "@/components/post/PostCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
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
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/HoverCard";
import { cn } from "@/lib/utils";
import previewStyles from "@/components/editor/FeedPreview.module.scss";
import styles from './PostComposer.module.scss';
import { cx } from '@/lib/style-utils';



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
  images?: string[];
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

const typeOptions: Array<{type: PostType;label: string;icon: IconName;tip: string;fields: string;}> = [
{ type: "image", label: "图文贴", icon: "image", tip: "适合直接分享一组图片，标题可以写成较长说明。", fields: "标题、图片、板块、话题" },
{ type: "rich", label: "长文贴", icon: "edit", tip: "适合写养护经验、教程、复盘这类结构化内容。", fields: "标题、富文本正文、封面、板块、话题" },
{ type: "journal", label: "记录贴", icon: "event", tip: "适合持续记录同一棵植物的状态变化。", fields: "植物对象、日期、阶段、图片、心得" },
{ type: "help", label: "提问帖", icon: "info", tip: "适合求助诊断、养护疑问和问题排查。", fields: "标题、问题描述、板块、话题" },
{ type: "vote", label: "投票帖", icon: "vote", tip: "适合让大家在多个选项中投票做选择。", fields: "问题、选项、截止时间、板块、话题" },
{ type: "video", label: "视频", icon: "video", tip: "适合发布状态展示、开箱、养护过程等视频内容。", fields: "标题、视频、板块、话题" },
{ type: "event", label: "活动帖", icon: "event", tip: "适合发布线下活动、团购组织、展会约看等信息。", fields: "标题、活动介绍、时间地点、板块、话题" }];


const visibilityOptions = [
{ value: "public", label: "公开（所有人可见）" },
{ value: "private", label: "仅自己可见" }];


const postTypeHasCover = (type: PostType) => type !== "image" && type !== "video";

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
  onDraftsChanged
}: PostComposerProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const isEdit = mode === "edit";

  const [type, setType] = useState<PostType>(initialValue?.type ?? "rich");
  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [contentJson, setContentJson] = useState<unknown>(
    initialValue?.contentJson ?? (initialValue?.content ? createJsonFromHtml(initialValue.content) : null)
  );
  const [categorySlug, setCategorySlug] = useState(initialValue?.categorySlug ?? "");
  const [genusSlug, setGenusSlug] = useState(initialValue?.genusSlug ?? "");
  const [speciesSlug, setSpeciesSlug] = useState(initialValue?.speciesSlug ?? "");
  const [boardLabel, setBoardLabel] = useState("");
  const [tags, setTags] = useState<string[]>(initialValue?.tags ?? []);
  const [images, setImages] = useState<string[]>(initialValue?.images ?? []);
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
    if (type === "image") return images.length;
    if (type === "journal") return journal.entries.reduce((sum, item) => sum + item.note.length, journal.subjectName.length);
    return content.length;
  }, [content, contentJson, images.length, journal, type]);
  const visibilityLabel = useMemo(
    () => visibilityOptions.find((option) => option.value === visibility)?.label ?? "公开（所有人可见）",
    [visibility]
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
    api.
    get<{items: MineAlbumOption[];}>("/api/albums/mine").
    then((data) => {
      setMineAlbums(data.items);
      setAlbumSyncAlbumId((current) => current || data.items[0]?.id || "");
    }).
    catch((error) => {
      toast.error(error instanceof ApiError ? error.message : "读取晒图相册失败");
    }).
    finally(() => setLoadingMineAlbums(false));
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
    images,
    videoUrl,
    voteOptions,
    voteMulti,
    voteDeadline,
    eventLocation,
    eventStartAt,
    journal,
    cover
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
    const p = d.payload as any ?? {};
    setType(p.type as PostType ?? d.type);
    setTitle(p.title ?? d.title ?? "");
    setContent(p.content ?? "");
    setContentJson(p.contentJson ?? null);
    setCategorySlug(p.categorySlug ?? p.boardSlug ?? categorySlug);
    setGenusSlug(p.genusSlug ?? "");
    setSpeciesSlug(p.speciesSlug ?? "");
    setBoardLabel(p.boardLabel ?? "");
    setTags(p.tags ?? []);
    setImages(p.images ?? []);
    setVideoUrl(p.videoUrl ?? "");
    setVoteOptions(p.voteOptions ?? ["", ""]);
    setVoteMulti(!!p.voteMulti);
    setVoteDeadline(p.voteDeadline ?? "");
    setEventLocation(p.eventLocation ?? "");
    setEventStartAt(p.eventStartAt ?? "");
    if (p.journal) setJournal(p.journal as JournalDraft);
    setCover(postTypeHasCover(p.type as PostType ?? d.type) ? p.cover ?? "" : "");
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
    if ((type === "image" || type === "video") && title.length > 500) errors.add("title");
    if (!type) errors.add("type");
    if (!genusSlug && !categorySlug && !speciesSlug) errors.add("board");
    if (tags.length === 0) errors.add("tags");
    if (type === "rich" && !hasRichContent()) errors.add("richContent");
    if (type === "image" && images.length === 0) errors.add("imageImages");
    if (type === "short" && !content.trim()) errors.add("shortContent");
    if (type === "help" && !content.trim()) errors.add("helpContent");
    if (type === "video" && !videoUrl.trim()) errors.add("videoUrl");
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
    ["richContent", "长文贴需要填写正文"],
    ["imageImages", "图文贴需要至少上传一张图片"],
    ["shortContent", "纯文字帖需要填写正文内容"],
    ["helpContent", "提问帖需要描述问题现象、环境或已尝试的方法"],
    ["videoUrl", t("editor.errors.videoUrlRequired")],
    ["voteContent", "投票帖需要填写投票说明"],
    ["voteOptions", t("editor.errors.voteOptionsMin")],
    ["voteDeadline", "请选择投票截止时间"],
    ["eventContent", "活动帖需要填写活动介绍"],
    ["eventLocation", "请填写活动地点"],
    ["eventStartAt", "请选择活动开始时间"],
    ["journalSpecies", "记录贴需要选择具体品种"],
    ["journalName", "请填写记录对象的植物昵称"],
    ["journalDate", "请选择记录贴的起始日期"],
    ["journalEntries", "请至少添加一条记录"],
    ["board", t("editor.chooseBoard")],
    ["tags", "请至少添加一个话题"]];

    const exact = ordered.find(([key]) => errors.has(key));
    if (exact) return exact[1];
    if ([...errors].some((key) => key.startsWith("journalEntryDate:"))) return "请补全记录日期";
    if ([...errors].some((key) => key.startsWith("journalEntryStage:"))) return "请选择记录阶段";
    if ([...errors].some((key) => key.startsWith("journalEntryStageLabel:"))) return "选择其他阶段时，请填写阶段名称";
    if ([...errors].some((key) => key.startsWith("journalEntryImages:"))) return "每条记录都需要上传配图";
    if ([...errors].some((key) => key.startsWith("journalEntryNote:"))) return "请填写记录心得";
    return null;
  };

  const submit = async () => {
    if (!validate()) return;
    const isRich = type === "rich" || type === "event";
    const isMediaOnly = type === "image" || type === "video";
    const postImages = Array.from(new Set(type === "image" ? images : isRich ? contentImages : []));
    const finalCover = postTypeHasCover(type) ? cover : "";
    const syncImages = Array.from(new Set([...(finalCover ? [finalCover] : []), ...postImages, ...getJournalImageUrls(journal)]));
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
      ...(isRich ? { contentJson } : isMediaOnly ? { content: "" } : { content }),
      tags,
      ...(!postTypeHasCover(type) ? { cover: null } : finalCover && { cover: finalCover }),
      ...(postImages.length > 0 && { images: postImages }),
      ...(type === "video" && { videoUrl }),
      ...(type === "vote" && {
        vote: {
          question: title,
          options: voteOptions.filter((x) => x.trim()),
          multi: voteMulti,
          deadline: new Date(voteDeadline).toISOString()
        }
      }),
      ...(type === "event" && {
        event: {
          location: eventLocation,
          startAt: new Date(eventStartAt).toISOString(),
          endAt: new Date(eventStartAt).toISOString()
        }
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
            images: e.images
          }))
        }
      }),
      ...(albumSyncMode !== "none" && {
        albumSync: {
          mode: albumSyncMode,
          ...(albumSyncMode === "existing" && { albumId: albumSyncAlbumId }),
          ...(albumSyncMode === "new" && {
            title: albumSyncTitle.trim() || undefined,
            description: albumSyncDescription.trim() || undefined
          }),
          syncCoverAsAlbumCover
        }
      })
    };

    setSubmitting(true);
    try {
      if (isEdit && initialValue?.id) {
        const result = await api.patch<{ok: boolean;needsReview: boolean;}>(`/api/posts/${initialValue.id}`, body);
        toast.success(result.needsReview ? "已保存，等待审核" : "已保存");
        setTimeout(() => router.push(`/post/${initialValue.id}`), 800);
        return;
      }

      const created = await api.post<{id: string;}>("/api/posts", body);
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
      }}>

      <div
        className={cn(cx("editor-workspace", styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_e430eff5, styles.r_b49d4c5d),

        isEdit ? styles.r_7807d23f : styles.r_7807d23f


        )}>

        <section className={cx(styles.r_60fbb771, styles.r_a2c4244a, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_0c3bc985, styles.r_0ed97747)}>
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_6f27f4f7, styles.r_8ef2268e, styles.r_1004c0c3)}>
              <div>
                <h1 className={cx(styles.r_3febee09, styles.r_69450ef1, styles.r_6d623258)}>{isEdit ? "编辑帖子" : "新建帖子"}</h1>
                <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_7b89cd85)}>分享你的多肉种植经验、心得或美图吧</p>
              </div>
              {isEdit && <PostTypeBadge type={type} />}
            </div>

          <div className={cx(styles.r_60fbb771, styles.r_36e579c0, styles.r_8dddea07, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_438b2237)}>
            <Form.Field name="type" serverInvalid={validationErrors.has("type")}>
              <Form.Label className={cx(styles.r_a77ed4d9, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
                <span className={styles.r_fa512798}>*</span> 帖子类型
              </Form.Label>
              <Form.Control
                value={type}
                required
                readOnly
                tabIndex={-1}
                aria-hidden
                className={styles.r_2daa8e5e} />

              <EditorTypePicker
                type={type}
                isEdit={isEdit}
                invalid={validationErrors.has("type")}
                onChange={(nextType) => {
                  setType(nextType);
                  clearValidationError("type");
                }} />

              <Form.Message
                match="valueMissing"
                forceMatch={validationErrors.has("type")}
                className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

                请选择帖子类型
              </Form.Message>
            </Form.Field>
            <Form.Field name="title" serverInvalid={validationErrors.has("title")} className={styles.r_fb77735e}>
              <Form.Label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
                <span className={styles.r_fa512798}>*</span> 帖子标题
              </Form.Label>
              <Form.Control asChild>
                {type === "image" ?
                <Textarea
                  required
                  value={title}
                  error={validationErrors.has("title")}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) clearValidationError("title");
                  }}
                  placeholder="分享这组图的看点、状态或养护背景"
                  maxLength={500}
                  showCount
                  rows={5}
                  className={cx(styles.r_ee15a477, styles.r_ab3a6ebd, styles.r_7eff2faf)} /> :

                type === "video" ?
                <Textarea
                  required
                  value={title}
                  error={validationErrors.has("title")}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (e.target.value.trim()) clearValidationError("title");
                  }}
                  placeholder={t("editor.placeholderShort")}
                  maxLength={500}
                  showCount
                  className={cx(styles.r_ee15a477, styles.r_ab3a6ebd, styles.r_7eff2faf)} /> :


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
                  showCount />

                }
              </Form.Control>
              <Form.Message
                match="valueMissing"
                forceMatch={validationErrors.has("title")}
                className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

                请输入帖子标题
              </Form.Message>
            </Form.Field>
            <div className={styles.r_fb77735e}>
              <PostContentFields
                type={type}
                t={t}
                content={content}
                validationErrors={validationErrors}
                onClearValidationError={clearValidationError}
                onContentChange={setContent}
                contentJson={contentJson}
                onContentJsonChange={setContentJson}
                images={images}
                onImagesChange={(value) => {
                  setImages(value);
                  if (value.length > 0) clearValidationError("imageImages");
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
                  clearJournalValidationErrors();
                }} />

            </div>

            {(type === "rich" || type === "event") &&
            <div className={cx(styles.r_eccd13ef, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_0e17f2bd, styles.r_03b4dd7f)}>
                <button
                type="button"
                className={cx(styles.r_e7a768f9, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)}
                onClick={() => setAlbumPickerMode("insert")}>

                  <Icon name="image" size={14} />
                  从我的晒图插入图片
                </button>
                <span className={cx(styles.r_359090c2, styles.r_7b89cd85)}>只可选择自己的晒图图片，插入后帖子会保留图片地址快照。</span>
              </div>
            }

            <div ref={settingsRef} className={cx(styles.r_fb77735e, styles.r_b950dda2, styles.r_ba4c5089, styles.r_691861bc, styles.r_52be2884, styles.r_e3800e5e)}>
              <PostSettingsCard
                cover={cover}
                onCoverChange={setCover}
                onPickAlbumCover={() => setAlbumPickerMode("cover")}
                showCover={postTypeHasCover(type)}
                boardSelection={{ categorySlug, genusSlug, speciesSlug }}
                onBoardChange={onBoardChange}
                boardInvalid={validationErrors.has("board") && !categorySlug || validationErrors.has("journalSpecies")}
                autoSelectFirst={!isEdit}
                visibility={visibility}
                onVisibilityChange={setVisibility}
                tags={tags}
                tagInvalid={validationErrors.has("tags")}
                onTagsChange={onTagChange}
                embedded />

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
                showCoverOption={postTypeHasCover(type)} />

            </div>

            <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_b950dda2, styles.r_88b684d2, styles.r_ce335a8e, styles.r_359090c2, styles.r_7b89cd85)}>
              <span>字数统计：{textCount}</span>
              <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_5f6a59f1)}>
                <Icon name="check" size={13} />
                已自动保存 14:30:25
              </span>
            </div>
          </div>
        </section>

        <aside className={cx(styles.r_7e0b7cdf, styles.r_3e7ce58d, styles.r_22add43e, styles.r_a86fc1b1, styles.r_a691f390)}>
          <EditorFeedPreview
            type={type}
            title={title}
            content={content}
            contentJson={contentJson}
            images={type === "image" ? images : contentImages}
            videoUrl={videoUrl}
            cover={postTypeHasCover(type) ? cover : ""}
            tags={tags}
            boardLabel={boardLabel}
            boardSelection={{ categorySlug, genusSlug, speciesSlug }}
            user={user}
            voteOptions={voteOptions}
            voteMulti={voteMulti}
            voteDeadline={voteDeadline}
            eventLocation={eventLocation}
            eventStartAt={eventStartAt}
            journal={journal} />

        </aside>
      </div>

      <AlbumImagePickerDialog
        open={albumPickerMode !== null}
        mode={albumPickerMode ?? "insert"}
        onClose={() => setAlbumPickerMode(null)}
        onConfirm={handleAlbumImagesPicked} />


      <div className={cx(styles.r_7bc55599, styles.r_3f6397bf, styles.r_68cc8644, styles.r_4802bd5b, styles.r_b950dda2, styles.r_88b684d2, styles.r_f5ebd4d0, styles.r_bfbfcdac, styles.r_0b2e8c28, styles.r_90070839)}>
        <div
          className={cn(cx(styles.r_0e12dc7d, styles.r_f3c543ad, styles.r_6da6a3c3, styles.r_f38d6f75, styles.r_0c3bc985, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_8497c333, styles.r_2499ab8d),

          isEdit ? styles.r_7807d23f : styles.r_7807d23f


          )}>

          <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_77a2a20e)}>
            <button
              type="button"
              onClick={handlePrimaryBottomAction}
              className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)}>

              <Icon
                name={isAtPageBottom ? "arrow-right" : "settings"}
                size={14}
                className={isAtPageBottom ? styles.r_31c8b9f7 : undefined} />

              {isAtPageBottom ? "回到顶部" : "帖子设置"}
            </button>
            <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_77c08e01, styles.r_77a2a20e)}>
              {!isEdit && onSaveDraft ?
              <button type="button" onClick={saveDraft} className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)}>
                  <Icon name="edit" size={14} />
                  保存草稿
                </button> :
              initialValue?.id ?
              <Link href={`/post/${initialValue.id}`} className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)}>
                  取消
                </Link> :

              <button type="button" className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)} disabled>
                  保存草稿
                </button>
              }
              <button type="button" className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)}>
                <Icon name="eye" size={14} />
                预览
              </button>
              <Form.Submit disabled={submitting} className={cx(styles.r_426b8b75, styles.r_86843cf1, styles.r_23b4e5ed, styles.r_fc7473ca)}>
                <Icon name="send" size={14} />
                {submitting ? t("editor.submitting") : isEdit ? "保存" : "发布帖子"}
              </Form.Submit>
            </div>
          </div>
        </div>
      </div>
    </Form.Root>);

}

function EditorTypePicker({
  type,
  isEdit,
  invalid,
  onChange





}: {type: PostType;isEdit: boolean;invalid?: boolean;onChange: (type: PostType) => void;}) {
  if (isEdit) {
    return (
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_9ac94195, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_fc7473ca, styles.r_eb6abb1f)}>
        <PostTypeBadge type={type} />
        <span className={cx(styles.r_359090c2, styles.r_7b89cd85)}>编辑时不能修改类型</span>
      </div>);

  }

  return (
    <div className={cn(cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_e00ad816, styles.r_a1de1eab, styles.r_97b1b320), invalid && cx(styles.r_5f22e64f, styles.r_16b1efa5, styles.r_6b7b677a))}>
      {typeOptions.map((item) => {
        const active = type === item.type;
        return (
          <HoverCard key={item.type}>
            <HoverCardTrigger>
              <button
                type="button"
                onClick={() => onChange(item.type)}
                className={cn(cx(styles.r_52083e7d, styles.r_f82f0c25, styles.r_3960ffc2, styles.r_86843cf1, styles.r_77a2a20e, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_e83a7042, styles.r_56bf8ae8),

                active ? cx(styles.r_d3b27cd9, styles.r_7ebecbb6, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_88b684d2, styles.r_5e10cdb8, styles.r_eb6abb1f, styles.r_a5c39c39, styles.r_80751c7f)


                )}>

                <Icon name={item.icon} size={15} />
                {item.label}
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="center" side="top" className={cx(styles.r_6ca62528, styles.r_eb6e8b88)}>
              <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca, styles.r_e83a7042, styles.r_4ddaa618)}>
                <Icon name={item.icon} size={15} className={styles.r_5f6a59f1} />
                {item.label}
              </div>
              <p className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_7054e276, styles.r_02eb621e)}>{item.tip}</p>
              <p className={cx(styles.r_50d0d216, styles.r_b950dda2, styles.r_88b684d2, styles.r_f46b61a9, styles.r_359090c2, styles.r_7054e276, styles.r_66a36c90)}>{item.fields}</p>
            </HoverCardContent>
          </HoverCard>);

      })}
    </div>);

}

function EditorFeedPreview({
  type,
  title,
  content,
  contentJson,
  images,
  videoUrl,
  cover,
  tags,
  boardLabel,
  boardSelection,
  user,
  voteOptions,
  voteMulti,
  voteDeadline,
  eventLocation,
  eventStartAt,
  journal


















}: {type: PostType;title: string;content: string;contentJson: unknown;images: string[];videoUrl: string;cover: string;tags: string[];boardLabel: string;boardSelection: BoardSelection;user: User | null;voteOptions: string[];voteMulti: boolean;voteDeadline: string;eventLocation: string;eventStartAt: string;journal: JournalDraft;}) {
  const previewPost = buildPreviewPost({
    type,
    title,
    content,
    contentJson,
    images,
    videoUrl,
    cover,
    tags,
    boardLabel,
    boardSelection,
    user,
    voteOptions,
    voteMulti,
    voteDeadline,
    eventLocation,
    eventStartAt,
    journal
  });

  return (
    <section className={previewStyles.previewPanel}>
      <h2 className={previewStyles.previewTitle}>帖子预览</h2>
      <div className={previewStyles.previewList}>
        <ScaledFeedPreview title="H5 预览" post={previewPost} canvasWidth={375} />
        <ScaledFeedPreview title="PC 预览" post={previewPost} canvasWidth={480} />
      </div>
    </section>);

}

function ScaledFeedPreview({ title, post, canvasWidth }: {title: string;post: Post;canvasWidth: number;}) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [bodyWidth, setBodyWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const scale = bodyWidth > 0 ? Math.min(1, bodyWidth / canvasWidth) : 1;
  const canvasStyle = {
    "--preview-canvas-width": `${canvasWidth}px`,
    "--preview-scale": String(scale)
  } as CSSProperties & Record<"--preview-canvas-width" | "--preview-scale", string>;
  const bodyStyle = {
    height: canvasHeight > 0 ? `${canvasHeight * scale}px` : undefined
  } satisfies CSSProperties;

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const updateWidth = () => setBodyWidth(el.clientWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const updateHeight = () => setCanvasHeight(el.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [post, scale]);

  return (
    <div className={previewStyles.viewportCard}>
      <div className={previewStyles.viewportHeader}>
        <span className={previewStyles.viewportName}>{title}</span>
        <span className={previewStyles.viewportSize}>{canvasWidth}px</span>
      </div>
      <div
        ref={bodyRef}
        className={previewStyles.viewportBody}
        style={bodyStyle}
        onClickCapture={(event) => event.preventDefault()}>

        <div ref={canvasRef} className={previewStyles.previewCanvas} style={canvasStyle}>
          <PostCard post={post} className={previewStyles.previewCard} />
        </div>
      </div>
    </div>);

}

function PostSettingsCard({
  cover,
  onCoverChange,
  onPickAlbumCover,
  showCover,
  boardSelection,
  onBoardChange,
  boardInvalid,
  autoSelectFirst,
  visibility,
  onVisibilityChange,
  tags,
  tagInvalid,
  onTagsChange,
  embedded = false















}: {cover: string;onCoverChange: (cover: string) => void;onPickAlbumCover: () => void;showCover: boolean;boardSelection: BoardSelection;onBoardChange: (selection: BoardSelection) => void;boardInvalid: boolean;autoSelectFirst: boolean;visibility: string;onVisibilityChange: (visibility: string) => void;tags: string[];tagInvalid: boolean;onTagsChange: (tags: string[]) => void;embedded?: boolean;}) {
  return (
    <section className={cn(!embedded && cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_5e10cdb8, styles.r_8e63407b, styles.r_438b2237))}>
      <h2 className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>帖子设置</h2>
      <div className={cx(styles.r_0ab86672, styles.r_fa6acbf8, styles.r_1790d566, styles.r_8b819609, styles.r_88b684d2)}>
        {showCover &&
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
            <div>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>封面图</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>用于列表和分享预览。</div>
            </div>
            <div className={cx(styles.r_60fbb771, styles.r_7e0b7cdf, styles.r_8dddea07, styles.r_60541e1e, styles.r_77a2a20e)}>
              <UploadField
              kind="image"
              value={cover ? [cover] : []}
              onChange={(arr) => onCoverChange(arr[0] ?? "")}
              max={1}
              simpleMode
              className={cx(styles.r_44879387, styles.r_c0980a65)}
              gridClassName={styles.r_2170e138}
              itemClassName={cx(styles.r_826c9471, styles.r_5f22e64f, styles.r_7ebecbb6)}
              itemImageClassName={styles.r_7d85d0c2} />

              <div className={cx(styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>
                <div className={cx(styles.r_e83a7042, styles.r_eb6abb1f)}>更换封面</div>
                <div>建议尺寸 16:9，支持 JPG/PNG</div>
              </div>
              <button type="button" className={cx(styles.r_e7a768f9, styles.r_5e10cdb8, styles.r_23b4e5ed, styles.r_fc7473ca)} onClick={onPickAlbumCover}>
                <Icon name="image" size={14} />
                从我的晒图设封面
              </button>
            </div>
          </div>
        }

        <Form.Field name="board" serverInvalid={boardInvalid} className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
          <div>
            <Form.Label className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}><span className={styles.r_fa512798}>*</span> 板块</Form.Label>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>选择内容归属的科、属或品种。</div>
          </div>
          <div className={cx(styles.r_06950372, styles.r_c0980a65)}>
            <Form.Control
              value={[boardSelection.categorySlug, boardSelection.genusSlug, boardSelection.speciesSlug].filter(Boolean).join("/")}
              required
              readOnly
              tabIndex={-1}
              aria-hidden
              className={styles.r_2daa8e5e} />

            <BoardSelect
              value={boardSelection}
              onChange={onBoardChange}
              invalid={boardInvalid}
              autoSelectFirst={autoSelectFirst} />

            <Form.Message
              match="valueMissing"
              forceMatch={boardInvalid}
              className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

              请选择板块
            </Form.Message>
          </div>
        </Form.Field>

        <Form.Field name="tags" serverInvalid={tagInvalid} className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
          <div>
            <Form.Label className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}><span className={styles.r_fa512798}>*</span> 话题</Form.Label>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>最多 6 个，帮助同好发现内容。</div>
          </div>
          <div>
            <Form.Control
              value={tags.join(",")}
              required
              readOnly
              tabIndex={-1}
              aria-hidden
              className={styles.r_2daa8e5e} />

            <TagSelector
              className={cx(styles.r_06950372, styles.r_c0980a65)}
              controlClassName={tagInvalid ? cx(styles.r_3b7f9781, styles.r_fdae7b46) : undefined}
              value={tags}
              onChange={onTagsChange}
              max={6} />

            <Form.Message
              match="valueMissing"
              forceMatch={tagInvalid}
              className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

              请至少添加一个话题
            </Form.Message>
          </div>
        </Form.Field>

        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
          <div>
            <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>可见范围</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>控制帖子发布后的访问权限。</div>
          </div>
          <Select
            value={visibility}
            onValueChange={onVisibilityChange}
            options={visibilityOptions}
            wrapperClassName={cx(styles.r_06950372, styles.r_c0980a65)} />

        </div>

      </div>
    </section>);

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
  showCoverOption














}: {mode: AlbumSyncMode;onModeChange: (mode: AlbumSyncMode) => void;albums: MineAlbumOption[];loadingAlbums: boolean;albumId: string;onAlbumIdChange: (id: string) => void;title: string;onTitleChange: (title: string) => void;description: string;onDescriptionChange: (description: string) => void;syncCoverAsAlbumCover: boolean;onSyncCoverAsAlbumCoverChange: (value: boolean) => void;showCoverOption: boolean;}) {
  const selectedAlbum = albums.find((album) => album.id === albumId) ?? null;
  const [albumSearch, setAlbumSearch] = useState("");
  const visibleAlbums = albums.filter((album) => {
    const keyword = albumSearch.trim().toLowerCase();
    if (!keyword) return true;
    return `${album.title} ${album.id}`.toLowerCase().includes(keyword);
  });

  return (
    <section className={cx(styles.r_fb77735e, styles.r_b950dda2, styles.r_691861bc, styles.r_52be2884)}>
      <h2 className={cx(styles.r_4ee73492, styles.r_69450ef1, styles.r_4ddaa618)}>同步到晒图广场</h2>
      <div className={cx(styles.r_0ab86672, styles.r_fa6acbf8, styles.r_1790d566, styles.r_8b819609, styles.r_88b684d2)}>
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
          <div>
            <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>同步方式</div>
            <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>把本次帖子中的图片同步到你的晒图相册。</div>
          </div>
          <div className={styles.r_6ed543e2}>
            <div className={cx(styles.r_c5d9aaf6, styles.r_6da6a3c3, styles.r_1ccb99be, styles.r_be2e831b, styles.r_44ee8ba0, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_a8a62ca4, styles.r_eb6a3cef)}>
              {[
              { value: "none", label: "不同步" },
              { value: "new", label: "新建相册" },
              { value: "existing", label: "追加已有" }].
              map((option) =>
              <button
                key={option.value}
                type="button"
                onClick={() => onModeChange(option.value as AlbumSyncMode)}
                className={cn(cx(styles.r_e7a768f9, styles.r_421ac2be, styles.r_0e17f2bd, styles.r_fc7473ca, styles.r_e83a7042, styles.r_56bf8ae8),

                mode === option.value ? cx(styles.r_5e10cdb8, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_7b89cd85, styles.r_78541963, styles.r_90fb1d0a)


                )}>

                  {option.label}
                </button>
              )}
            </div>
            <p className={cx(styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>
              帖子会保留图片 URL 快照；将来删除相册，不会直接清空帖子里的图片。
            </p>
          </div>
        </div>

        {mode === "new" &&
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
            <div>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>新相册信息</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>标题可留空，系统会按帖子标题生成。</div>
            </div>
            <div className={cx(styles.r_be6bbdb1, styles.r_c0980a65, styles.r_6ed543e2)}>
              <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="相册标题"
              maxLength={50}
              showCount />

              <textarea
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="相册描述，可选"
              maxLength={500}
              className={cx(styles.r_36b9e99d, styles.r_6da6a3c3, styles.r_5bd7b080)} />

            </div>
          </div>
        }

        {mode === "existing" &&
        <div className={cx(styles.r_f3c543ad, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
            <div>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>目标相册</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>只能追加到你自己的相册，并自动跳过重复图片。</div>
            </div>
            <div className={styles.r_6f7e013d}>
              <Input
              value={albumSearch}
              onChange={(event) => setAlbumSearch(event.target.value)}
              placeholder={loadingAlbums ? "相册加载中..." : "搜索相册"}
              disabled={loadingAlbums || albums.length === 0}
              wrapperClassName={cx(styles.r_ccd6e543, styles.r_c0980a65)} />

              {visibleAlbums.length > 0 &&
            <div className={cx(styles.r_f3c543ad, styles.r_eab1df84, styles.r_be6bbdb1, styles.r_c0980a65, styles.r_77a2a20e, styles.r_92bf82f4, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_efb55408, styles.r_7660b450)}>
                  {visibleAlbums.map((album) => {
                const active = album.id === albumId;
                return (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => onAlbumIdChange(album.id)}
                    className={cn(cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_2eba0d65, styles.r_fc7473ca, styles.r_56bf8ae8),

                    active ? cx(styles.r_3883b0f9, styles.r_5e10cdb8, styles.r_e7eab4cb, styles.r_438b2237) : cx(styles.r_521fa0c7, styles.r_b0b66d88, styles.r_eb6abb1f, styles.r_5aae3db6, styles.r_29687528)


                    )}>

                        <span className={styles.r_7e0b7cdf}>
                          <span className={cx(styles.r_0214b4b3, styles.r_f283ea9b, styles.r_e83a7042)}>{album.title}</span>
                          <span className={cx(styles.r_15e1b1f4, styles.r_0214b4b3, styles.r_359090c2, styles.r_66a36c90)}>
                            {album.imageCount} 张{album.isPublic ? "" : " · 私密"}
                          </span>
                        </span>
                        {active && <Icon name="check" size={14} className={styles.r_5f6a59f1} />}
                      </button>);

              })}
                </div>
            }
              {!loadingAlbums && albums.length === 0 &&
            <p className={cx(styles.r_359090c2, styles.r_66a36c90)}>还没有可追加的晒图相册，可以改为新建相册。</p>
            }
              {!loadingAlbums && albums.length > 0 && visibleAlbums.length === 0 &&
            <p className={cx(styles.r_359090c2, styles.r_66a36c90)}>没有匹配的相册。</p>
            }
              {selectedAlbum && !selectedAlbum.isPublic &&
            <p className={cx(styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_97f24a4b, styles.r_67d2289d, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_7054e276, styles.r_85d79ebf)}>
                  目标相册是私密相册；如果帖子公开发布，图片仍会出现在帖子里。
                </p>
            }
            </div>
          </div>
        }

        {mode !== "none" && showCoverOption &&
        <label className={cx(styles.r_f3c543ad, styles.r_34516836, styles.r_1004c0c3, styles.r_cb11fec3, styles.r_d38cfb50)}>
            <div>
              <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>相册封面</div>
              <div className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>默认用同步图片中的第一张。</div>
            </div>
            <span className={cx(styles.r_52083e7d, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca, styles.r_eb6abb1f)}>
              <input
              type="checkbox"
              checked={syncCoverAsAlbumCover}
              onChange={(event) => onSyncCoverAsAlbumCoverChange(event.target.checked)}
              className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_07389a77, styles.r_aea3b3b7)} />

              同步使用帖子封面作为相册封面
            </span>
          </label>
        }
      </div>
    </section>);

}

function buildPreviewPost({
  type,
  title,
  content,
  contentJson,
  images,
  videoUrl,
  cover,
  tags,
  boardLabel,
  boardSelection,
  user,
  voteOptions,
  voteMulti,
  voteDeadline,
  eventLocation,
  eventStartAt,
  journal


















}: {type: PostType;title: string;content: string;contentJson: unknown;images: string[];videoUrl: string;cover: string;tags: string[];boardLabel: string;boardSelection: BoardSelection;user: User | null;voteOptions: string[];voteMulti: boolean;voteDeadline: string;eventLocation: string;eventStartAt: string;journal: JournalDraft;}): Post {
  const now = new Date().toISOString();
  const text = type === "rich" || type === "event" ? extractTextFromJson(contentJson) : content.trim();
  const cleanVoteOptions = voteOptions.map((option) => option.trim()).filter(Boolean);
  const journalEntries = journal.entries.filter((entry) => entry.entryDate || entry.note.trim() || entry.images.length > 0);
  const previewUser = user ?? createPreviewUser();

  return {
    id: "preview-post",
    type,
    title: title.trim() || "未填写标题",
    content: text,
    contentJson: type === "rich" || type === "event" ? contentJson : undefined,
    contentText: text || undefined,
    images,
    videoUrl: videoUrl || undefined,
    cover: cover || undefined,
    author: previewUser,
    board: createPreviewBoard(boardLabel, boardSelection),
    tags,
    createdAt: now,
    updatedAt: now,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    pins: [],
    pinState: { any: false, global: false, board: false, topic: false },
    locked: false,
    adminPermissions: {
      canManage: false,
      canEdit: false,
      canDelete: false,
      canMove: false,
      canPin: false,
      canLock: false,
      canBan: false,
      canReview: false
    },
    vote:
    type === "vote" ?
    {
      question: title.trim() || "未填写投票问题",
      options: (cleanVoteOptions.length > 0 ? cleanVoteOptions : ["选项一", "选项二"]).map((label, index) => ({
        id: `preview-vote-${index}`,
        label,
        votes: 0
      })),
      multi: voteMulti,
      deadline: voteDeadline ? new Date(voteDeadline).toISOString() : new Date(Date.now() + 86400_000).toISOString(),
      voted: false,
      votedOptionIds: []
    } :
    undefined,
    event:
    type === "event" ?
    {
      startAt: eventStartAt ? new Date(eventStartAt).toISOString() : now,
      endAt: eventStartAt ? new Date(eventStartAt).toISOString() : now,
      location: eventLocation.trim() || "未填写地点",
      attendees: 0
    } :
    undefined,
    journal:
    type === "journal" ?
    {
      subjectName: journal.subjectName.trim() || "未填写植物昵称",
      startDate: journal.startDate ? new Date(journal.startDate).toISOString() : now,
      endReason: "alive",
      entriesCount: journalEntries.length,
      daysSinceStart: getDaysSince(journal.startDate),
      entries: journalEntries.map((entry, index) => ({
        id: entry.id ?? `preview-journal-${index}`,
        entryDate: entry.entryDate ? new Date(entry.entryDate).toISOString() : now,
        stage: entry.stage || "other",
        stageLabel: entry.stage === "other" ? entry.stageLabel?.trim() || undefined : undefined,
        note: entry.note,
        images: entry.images,
        orderIdx: index,
        createdAt: now,
        likes: 0,
        comments: 0,
        liked: false
      }))
    } :
    undefined
  };
}

function createPreviewUser(): User {
  const now = new Date().toISOString();
  return {
    id: "preview-user",
    name: "当前用户",
    avatar: "",
    level: 1,
    followers: 0,
    following: 0,
    posts: 0,
    pointsBalance: 0,
    badges: [],
    joinedAt: now
  };
}

function createPreviewBoard(label: string, selection: BoardSelection): Board {
  const slug = selection.speciesSlug || selection.genusSlug || selection.categorySlug || "preview-board";
  const name = label.trim().split(" / ").filter(Boolean).pop() || "未选择板块";
  const path = [
  selection.categorySlug && { level: "category" as const, slug: selection.categorySlug, name },
  selection.genusSlug && { level: "genus" as const, slug: selection.genusSlug, name },
  selection.speciesSlug && { level: "species" as const, slug: selection.speciesSlug, name }].
  filter((item): item is {level: "category" | "genus" | "species";slug: string;name: string;} => Boolean(item));
  return {
    id: "preview-board",
    level: selection.speciesSlug ? "species" : selection.genusSlug ? "genus" : "category",
    slug,
    name,
    description: "",
    cover: "",
    icon: "",
    members: 0,
    posts: 0,
    path: path.length > 0 ? path : [{ level: "category", slug, name }]
  };
}

function getDaysSince(date: string) {
  if (!date) return 0;
  const start = new Date(date).getTime();
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 86400_000));
}

function CheckLine({ label }: {label: string;}) {
  return (
    <label className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
      <input type="checkbox" checked readOnly className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_07389a77, styles.r_aea3b3b7)} />
      {label}
    </label>);

}

function extractImagesFromJson(json: unknown): string[] {
  const images: string[] = [];
  const traverse = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: {src?: string;} | null;
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
    attrs: { src: url }
  })),
  { type: "paragraph" }];

  return doc;
}

function cloneDoc(json: unknown): {type: string;content?: unknown[];} {
  if (json && typeof json === "object" && (json as {type?: string;}).type === "doc") {
    return JSON.parse(JSON.stringify(json)) as {type: string;content?: unknown[];};
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
    const n = node as {text?: string;content?: unknown[];};
    if (typeof n.text === "string") count += n.text.length;
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return count;
}

function extractTextFromJson(json: unknown): string {
  const parts: string[] = [];
  const traverse = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {text?: string;content?: unknown[];};
    if (typeof n.text === "string") parts.push(n.text);
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function createJsonFromHtml(html: string): unknown {
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }]
  };
}
