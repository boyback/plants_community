import type { PostType } from '@/lib/types';

export type EditorT = (key: string) => string;

export interface PostDraft {
  id: string;
  title: string;
  type: PostType;
  savedAt: string;
  payload: Record<string, unknown> | null;
}
