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
import styles from './page.module.scss';
import { cx } from '@/lib/style-utils';



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
    </Suspense>);

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
    }};useEffect(() => {if (!authLoading && user) void loadDrafts(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, user]);if (!authLoading && !user) {return (
      <AppShell showFloatingAi={false}>
        <div className={cx(styles.r_0e12dc7d, styles.r_9794ab45, styles.r_a4d0f420, styles.r_ca6bf630)}>
          <div className={cx(styles.r_42536e69, styles.r_e83a7042)}>{t("error.unauthorized")}</div>
          <p className={cx(styles.r_b6b02c0e, styles.r_fc7473ca, styles.r_69335b95)}>{t("editor.title")}</p>
          <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_86843cf1, styles.r_77a2a20e)}>
            <Link href='/login?redirect=/editor' className='btn-primary'>
              {t("nav.login")}
            </Link>
            <Link href='/register' className='btn-outline'>
              {t("nav.register")}
            </Link>
          </div>
        </div>
      </AppShell>);

  }

  return (
    <AppShell showFloatingAi={false}>
      <PostComposer
        initialValue={{
          type: requestedType,
          categorySlug: searchParams.get("category") ?? searchParams.get("board") ?? "",
          genusSlug: searchParams.get("genus") ?? "",
          speciesSlug: searchParams.get("species") ?? ""
        }}
        drafts={drafts}
        onSaveDraft={async (payload, title, type) => {
          const res = await api.post<{id: string;savedAt: string;}>("/api/drafts", {
            id: payload.id,
            title,
            type,
            payload
          });
          return res.id;
        }}
        onDeleteDraft={async (id) => {
          await api.delete(`/api/drafts/${id}`).catch(() => null);
          await loadDrafts();
        }}
        onDraftsChanged={loadDrafts} />

    </AppShell>);

}

function toPostType(value: string | null): PostType | undefined {
  if (!value) return undefined;
  return ['rich', 'image', 'vote', 'video', 'event', 'help', 'journal'].includes(value) ?
  value as PostType :
  undefined;
}