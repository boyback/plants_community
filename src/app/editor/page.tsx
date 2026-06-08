"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { PostType } from "@/lib/types";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";
import { useI18n } from "@/i18n/I18nContext";
import { api } from "@/lib/client-api";
import { PostComposer } from "@/components/editor/PostComposer";

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
      <EditorPageInner />
    </Suspense>
  );
}

function EditorPageInner() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const requestedType = toPostType(searchParams.get("type"));

  const loadDrafts = async () => {
    if (!user) return;
    try {
      setDrafts(await api.get<Draft[]>("/api/drafts"));
    } catch {
      // Drafts are optional; publishing should not depend on this request.
    }
  };

  useEffect(() => {
    if (!authLoading && user) void loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  if (!authLoading && !user) {
    return (
      <AppShell showFloatingAi={false}>
        <div className='card mx-auto max-w-md p-10 text-center'>
          <div className='text-lg font-semibold'>{t("error.unauthorized")}</div>
          <p className='mt-1 text-sm text-leaf-700/70'>{t("editor.title")}</p>
          <div className='mt-5 flex justify-center gap-2'>
            <Link href='/login?redirect=/editor' className='btn-primary'>
              {t("nav.login")}
            </Link>
            <Link href='/register' className='btn-outline'>
              {t("nav.register")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showFloatingAi={false}>
      <PostComposer
        initialValue={{
          type: requestedType,
          categorySlug: searchParams.get("category") ?? searchParams.get("board") ?? "",
          genusSlug: searchParams.get("genus") ?? "",
          speciesSlug: searchParams.get("species") ?? "",
        }}
        drafts={drafts}
        onSaveDraft={async (payload, title, type) => {
          const res = await api.post<{ id: string; savedAt: string }>("/api/drafts", {
            id: payload.id,
            title,
            type,
            payload,
          });
          return res.id;
        }}
        onDeleteDraft={async (id) => {
          await api.delete(`/api/drafts/${id}`).catch(() => null);
          await loadDrafts();
        }}
        onDraftsChanged={loadDrafts}
      />
    </AppShell>
  );
}

function toPostType(value: string | null): PostType | undefined {
  if (!value) return undefined;
  return ['rich', 'short', 'vote', 'video', 'event', 'help', 'journal'].includes(value)
    ? (value as PostType)
    : undefined;
}
