import { UploadField } from '@/components/upload/UploadField';
import { TagSelector } from '@/components/editor/TagSelector';
import { BoardSelect } from '@/components/editor/BoardSelect';
import { FieldRow } from './FieldRow';
import type { EditorT } from './types';

interface BoardSelection {
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
}

interface Props {
  t: EditorT;
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
  onBoardChange: (selection: BoardSelection) => void;
  boardInvalid: boolean;
  autoSelectFirst: boolean;
  showBoard?: boolean;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  cover: string;
  onCoverChange: (cover: string) => void;
}

export function PostMetaFields({
  t,
  categorySlug,
  genusSlug,
  speciesSlug,
  onBoardChange,
  boardInvalid,
  autoSelectFirst,
  showBoard = true,
  tags,
  onTagsChange,
  cover,
  onCoverChange,
}: Props) {
  return (
    <div className='space-y-5'>
      {showBoard && (
        <div>
          <div className='mb-1.5 block text-sm font-semibold text-ink-800'>
            <span className='text-rose-500'>*</span> {t('editor.chooseBoard')}
          </div>
          <BoardSelect
            value={{ categorySlug, genusSlug, speciesSlug }}
            onChange={onBoardChange}
            invalid={boardInvalid}
            autoSelectFirst={autoSelectFirst}
          />
        </div>
      )}

      <FieldRow label={t('editor.tags')}>
        <TagSelector value={tags} onChange={onTagsChange} max={6} />
      </FieldRow>

      <FieldRow label={t('editor.cover')}>
        <div className='flex flex-col gap-3 rounded-lg border border-leaf-100 bg-leaf-50/20 p-3 sm:flex-row sm:items-center'>
          <UploadField
            kind='image'
            value={cover ? [cover] : []}
            onChange={(arr) => onCoverChange(arr[0] ?? '')}
            max={1}
            simpleMode
            className='w-full sm:w-48'
            itemClassName='h-36 rounded-lg bg-white'
            itemImageClassName='object-contain'
          />
          <div className='text-xs leading-5 text-leaf-700/70'>
            <div className='font-medium text-ink-700'>单张封面图</div>
            <div>不限比例，列表缩略图可能裁切，建议主体居中。</div>
          </div>
        </div>
      </FieldRow>
    </div>
  );
}
