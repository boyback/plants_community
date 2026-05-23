"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PostType } from "@/lib/types";
import { PostPreview } from "@/components/editor/PostPreview";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { api, ApiError } from "@/lib/client-api";
import { toast } from "@/components/ui/Toast";
import {
  emptyJournalDraft,
  type JournalDraft,
} from "@/components/post/JournalEditor";
import { PostTypeBadge } from "@/components/ui/PostTypeBadge";
import { FieldRow } from "@/components/editor/post-form/FieldRow";
import { PostTypeField } from "@/components/editor/post-form/PostTypeField";
import { PostContentFields } from "@/components/editor/post-form/PostContentFields";
import { PostMetaFields } from "@/components/editor/post-form/PostMetaFields";
import { DraftSidebar } from "@/components/editor/post-form/DraftSidebar";
import type { PostDraft } from "@/components/editor/post-form/types";

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
    initialValue?.contentJson ??
      (initialValue?.content ? createJsonFromHtml(initialValue.content) : null),
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
    const contentImages = isRich ? extractImagesFromJson(contentJson) : [];
    const images = Array.from(new Set(contentImages));
    const boardPayload = speciesSlug
      ? { speciesSlug }
      : genusSlug
        ? { genusSlug }
        : { categorySlug };
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
        const result = await api.patch<{ ok: boolean; needsReview: boolean }>(
          `/api/posts/${initialValue.id}`,
          body,
        );
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
    <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1fr_280px]'>
      <div className='min-w-0 space-y-5'>
        <div className='card p-6'>
          <div className='mb-4 flex items-center justify-between gap-3'>
            <h1 className='text-xl font-semibold'>
              {isEdit ? "编辑帖子" : t("editor.title")}
            </h1>
            {isEdit && <PostTypeBadge type={type} />}
          </div>

          <PostTypeField type={type} isEdit={isEdit} t={t} onChange={setType} />

          <div className='space-y-3'>
            <FieldRow label={<><span className='text-rose-500'>*</span> 帖子标题</>}>
              <Input
                className='!text-base font-medium leading-6'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("editor.placeholderTitle")}
                maxLength={60}
                showCount
              />
            </FieldRow>

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

            <PostMetaFields
              t={t}
              categorySlug={categorySlug}
              genusSlug={genusSlug}
              speciesSlug={speciesSlug}
              onBoardChange={(selection) => {
                setCategorySlug(selection.categorySlug);
                setGenusSlug(selection.genusSlug);
                setSpeciesSlug(selection.speciesSlug);
                setValidationErrors((prev) => {
                  const next = new Set(prev);
                  next.delete("board");
                  return next;
                });
              }}
              boardInvalid={validationErrors.has("board") && !categorySlug}
              autoSelectFirst={!isEdit}
              tags={tags}
              onTagsChange={setTags}
              cover={cover}
              onCoverChange={setCover}
            />
          </div>

          <div className='mt-6 flex items-center justify-between border-t border-leaf-100 pt-4'>
            <div className='text-xs text-leaf-700/70'>
              {isEdit ? "保存后返回帖子详情" : draftId ? t("editor.saveDraft") : t("editor.title")}
            </div>
            <div className='flex gap-2'>
              {isEdit && initialValue?.id && (
                <Link href={`/post/${initialValue.id}`} className='btn-outline'>
                  取消
                </Link>
              )}
              {!isEdit && onSaveDraft && (
                <button type='button' onClick={saveDraft} className='btn-outline'>
                  <Icon name='edit' size={14} />
                  {t("editor.saveDraft")}
                </button>
              )}
              <button type='button' onClick={submit} disabled={submitting} className='btn-primary'>
                <Icon name='check' size={14} />
                {submitting ? t("editor.submitting") : isEdit ? "保存" : t("editor.submit")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='space-y-4'>
        <PostPreview
          type={type}
          title={title}
          content={content}
          contentJson={contentJson}
          images={extractImagesFromJson(contentJson)}
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
      </div>
    </div>
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

function createJsonFromHtml(html: string): unknown {
  const text = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}
