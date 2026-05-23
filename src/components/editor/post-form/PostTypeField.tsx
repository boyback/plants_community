import type { PostType } from '@/lib/types';
import { TypePicker } from '@/components/post/TypePicker';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import type { EditorT } from './types';

export function PostTypeField({
  type,
  isEdit,
  t,
  onChange,
}: {
  type: PostType;
  isEdit: boolean;
  t: EditorT;
  onChange: (type: PostType) => void;
}) {
  return (
    <div className='mb-5'>
      <div className='mb-1.5 block text-sm font-semibold text-ink-800'>
        <span className='text-rose-500'>*</span> {t('editor.pickType')}
      </div>
      {isEdit ? (
        <div className='flex items-center gap-2'>
          <PostTypeBadge type={type} />
          <span className='text-xs text-leaf-700/70'>编辑时不能修改类型</span>
        </div>
      ) : (
        <TypePicker value={type} onChange={onChange} />
      )}
    </div>
  );
}
