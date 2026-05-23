import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { EditorT, PostDraft } from './types';

interface Props {
  drafts: PostDraft[];
  draftId: string | null;
  t: EditorT;
  onLoadDraft: (draft: PostDraft) => void;
  onDeleteDraft?: (draft: PostDraft) => Promise<void> | void;
}

export function DraftSidebar({
  drafts,
  draftId,
  t,
  onLoadDraft,
  onDeleteDraft,
}: Props) {
  return (
    <>
      <div className='card p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='text-sm font-semibold text-ink-800'>
            {t('editor.saveDraft')}
          </div>
          <span className='text-[11px] text-leaf-700/70'>{drafts.length}</span>
        </div>
        {drafts.length === 0 ? (
          <p className='py-4 text-center text-xs text-leaf-700/60'>{t('common.empty')}</p>
        ) : (
          <ul className='space-y-2'>
            {drafts.map((draft) => (
              <li
                key={draft.id}
                className={cn(
                  'group relative rounded-lg border p-2.5 transition-colors',
                  draftId === draft.id
                    ? 'border-leaf-300 bg-leaf-50'
                    : 'border-leaf-100 hover:border-leaf-200',
                )}
              >
                <button
                  type='button'
                  onClick={() => onLoadDraft(draft)}
                  className='block w-full text-left'
                >
                  <div className='truncate text-sm font-medium text-ink-800'>
                    {draft.title || t('common.empty')}
                  </div>
                  <div className='mt-0.5 text-[10px] text-leaf-700/70'>
                    {t(`post.types.${draft.type}`)} · {new Date(draft.savedAt).toLocaleString()}
                  </div>
                </button>
                <button
                  type='button'
                  onClick={() => void onDeleteDraft?.(draft)}
                  className='absolute right-1.5 top-1.5 text-leaf-600 opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100'
                  aria-label={t('common.delete')}
                >
                  <Icon name='trash' size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className='card p-4 text-xs text-leaf-700/80'>
        <div className='mb-2 font-semibold text-ink-800'>{t('editor.tips.title')}</div>
        <ul className='ml-4 list-disc space-y-1'>
          <li>{t('editor.tips.item1')}</li>
          <li>{t('editor.tips.item2')}</li>
          <li>{t('editor.tips.item3')}</li>
          <li>{t('editor.tips.item4')}</li>
        </ul>
      </div>
    </>
  );
}
