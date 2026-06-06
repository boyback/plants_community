import type { PostType } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { UploadField } from '@/components/upload/UploadField';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { JournalEditor, type JournalDraft } from '@/components/post/JournalEditor';
import { FieldRow } from './FieldRow';
import type { EditorT } from './types';
import { cn } from '@/lib/utils';

interface Props {
  type: PostType;
  t: EditorT;
  content: string;
  onContentChange: (value: string) => void;
  contentJson: unknown;
  onContentJsonChange: (value: unknown) => void;
  videoUrl: string;
  onVideoUrlChange: (value: string) => void;
  voteOptions: string[];
  onVoteOptionsChange: (value: string[]) => void;
  voteMulti: boolean;
  onVoteMultiChange: (value: boolean) => void;
  voteDeadline: string;
  onVoteDeadlineChange: (value: string) => void;
  voteOptionsLocked: boolean;
  eventLocation: string;
  onEventLocationChange: (value: string) => void;
  eventStartAt: string;
  onEventStartAtChange: (value: string) => void;
  journal: JournalDraft;
  onJournalChange: (value: JournalDraft) => void;
  invalid?: boolean;
}

export function PostContentFields({
  type,
  t,
  content,
  onContentChange,
  contentJson,
  onContentJsonChange,
  videoUrl,
  onVideoUrlChange,
  voteOptions,
  onVoteOptionsChange,
  voteMulti,
  onVoteMultiChange,
  voteDeadline,
  onVoteDeadlineChange,
  voteOptionsLocked,
  eventLocation,
  onEventLocationChange,
  eventStartAt,
  onEventStartAtChange,
  journal,
  onJournalChange,
  invalid,
}: Props) {
  if (type === 'rich') {
    return (
      <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
        <RichTextEditor
          value={contentJson}
          onChange={onContentJsonChange}
          placeholder={t('editor.placeholderRich')}
          minHeight={460}
          charLimit={20000}
          className={cn("rounded-xl", invalid && "ring-2 ring-rose-100")}
        />
      </FieldRow>
    );
  }

  if (type === 'short') {
    return (
      <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
        <Textarea
          className='min-h-[140px] !text-base leading-7'
          error={invalid}
          placeholder={t('editor.placeholderShort')}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          maxLength={500}
          showCount
        />
      </FieldRow>
    );
  }

  if (type === 'help') {
    return (
      <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
        <Textarea
          className='min-h-[140px] !text-base leading-7'
          error={invalid}
          placeholder={t('editor.placeholderShort')}
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          maxLength={2000}
          showCount
        />
      </FieldRow>
    );
  }

  if (type === 'video') {
    return (
      <>
        <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
          <Textarea
            className='min-h-[100px] !text-base leading-7'
            error={invalid}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder={t('editor.placeholderShort')}
          />
        </FieldRow>
        <FieldRow label={t('editor.video')}>
          <UploadField
            kind='video'
            value={videoUrl ? [videoUrl] : []}
            onChange={(arr) => onVideoUrlChange(arr[0] ?? '')}
            max={1}
          />
        </FieldRow>
      </>
    );
  }

  if (type === 'vote') {
    return (
      <>
        <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
          <Textarea
            className='min-h-[80px] !text-base leading-7'
            error={invalid}
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            placeholder={t('editor.voteQuestion')}
          />
        </FieldRow>
        <FieldRow label={t('editor.vote')}>
          <div className='space-y-2'>
            {voteOptionsLocked && (
              <div className='rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700'>
                已有人投票，投票选项不能再编辑。
              </div>
            )}
            {voteOptions.map((option, index) => (
              <div key={index} className='flex gap-2'>
                <Input
                  value={option}
                  disabled={voteOptionsLocked}
                  onChange={(event) => {
                    const next = [...voteOptions];
                    next[index] = event.target.value;
                    onVoteOptionsChange(next);
                  }}
                  placeholder={`${t('editor.voteAddOption')} ${index + 1}`}
                />
                {voteOptions.length > 2 && (
                  <button
                    type='button'
                    className='btn-outline !px-3'
                    disabled={voteOptionsLocked}
                    onClick={() => onVoteOptionsChange(voteOptions.filter((_, i) => i !== index))}
                  >
                    <Icon name='trash' size={14} />
                  </button>
                )}
              </div>
            ))}
            {!voteOptionsLocked && voteOptions.length < 8 && (
              <button
                type='button'
                className='btn-ghost !text-xs'
                onClick={() => onVoteOptionsChange([...voteOptions, ''])}
              >
                <Icon name='plus' size={14} />
                {t('editor.voteAddOption')}
              </button>
            )}
          </div>
        </FieldRow>
        <div className='grid grid-cols-2 gap-4'>
          <FieldRow label={t('editor.voteMulti')}>
            <label className='flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={voteMulti}
                onChange={(event) => onVoteMultiChange(event.target.checked)}
                className='h-4 w-4 accent-leaf-500'
              />
              {t('editor.voteMulti')}
            </label>
          </FieldRow>
          <FieldRow label={t('editor.voteDeadline')}>
            <Input
              type='datetime-local'
              value={voteDeadline}
              onChange={(event) => onVoteDeadlineChange(event.target.value)}
            />
          </FieldRow>
        </div>
      </>
    );
  }

  if (type === 'event') {
    return (
      <>
        <FieldRow label={<><span className="text-rose-500">*</span> 正文内容</>}>
          <RichTextEditor
            value={contentJson}
            onChange={onContentJsonChange}
            placeholder={t('editor.event')}
            minHeight={460}
            charLimit={5000}
            className={cn("rounded-xl", invalid && "ring-2 ring-rose-100")}
          />
        </FieldRow>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FieldRow label={t('editor.eventLocation')}>
            <Input
              value={eventLocation}
              onChange={(event) => onEventLocationChange(event.target.value)}
              placeholder={t('editor.eventLocation')}
            />
          </FieldRow>
          <FieldRow label={t('editor.eventStartAt')}>
            <Input
              type='datetime-local'
              value={eventStartAt}
              onChange={(event) => onEventStartAtChange(event.target.value)}
            />
          </FieldRow>
        </div>
      </>
    );
  }

  if (type === 'journal') {
    return <JournalEditor value={journal} onChange={onJournalChange} />;
  }

  return null;
}
