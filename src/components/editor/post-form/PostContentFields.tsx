import type { ReactNode } from 'react';
import type { PostType } from '@/lib/types';
import { Form } from 'radix-ui';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { UploadField } from '@/components/upload/UploadField';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { JournalEditor, type JournalDraft } from '@/components/post/JournalEditor';
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
  validationErrors: Set<string>;
  onClearValidationError: (key: string) => void;
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
  validationErrors,
  onClearValidationError,
}: Props) {
  if (type === 'rich') {
    const invalid = validationErrors.has('richContent');
    return (
      <PostFormField
        name="richContent"
        label="图文内容"
        required
        invalid={invalid}
        message="图文帖需要填写正文，或至少插入一张图片"
        hiddenValue={hasRichContent(contentJson) ? 'ok' : ''}
      >
        <RichTextEditor
          value={contentJson}
          onChange={(value) => {
            onContentJsonChange(value);
            onClearValidationError('richContent');
          }}
          placeholder={t('editor.placeholderRich')}
          minHeight={460}
          charLimit={20000}
          className={cn("rounded-xl", invalid && "ring-2 ring-rose-100")}
        />
      </PostFormField>
    );
  }

  if (type === 'short') {
    const invalid = validationErrors.has('shortContent');
    return (
      <PostFormField name="shortContent" label="纯文字内容" required invalid={invalid} message="纯文字帖需要填写正文内容">
        <Form.Control asChild>
          <Textarea
            required
            className='min-h-[140px] !text-base leading-7'
            error={invalid}
            placeholder={t('editor.placeholderShort')}
            value={content}
            onChange={(event) => {
              onContentChange(event.target.value);
              if (event.target.value.trim()) onClearValidationError('shortContent');
            }}
            maxLength={500}
            showCount
          />
        </Form.Control>
      </PostFormField>
    );
  }

  if (type === 'help') {
    const invalid = validationErrors.has('helpContent');
    return (
      <PostFormField name="helpContent" label="问题描述" required invalid={invalid} message="请描述问题现象、养护环境或已尝试的方法">
        <Form.Control asChild>
          <Textarea
            required
            className='min-h-[140px] !text-base leading-7'
            error={invalid}
            placeholder="例如：叶片发软多久了、最近浇水/光照/通风情况、是否翻盆或用药。"
            value={content}
            onChange={(event) => {
              onContentChange(event.target.value);
              if (event.target.value.trim()) onClearValidationError('helpContent');
            }}
            maxLength={2000}
            showCount
          />
        </Form.Control>
      </PostFormField>
    );
  }

  if (type === 'video') {
    const contentInvalid = validationErrors.has('videoContent');
    const videoInvalid = validationErrors.has('videoUrl');
    return (
      <>
        <PostFormField name="videoContent" label="视频说明" required invalid={contentInvalid} message="请给视频补充一段说明">
          <Form.Control asChild>
            <Textarea
              required
              className='min-h-[100px] !text-base leading-7'
              error={contentInvalid}
              value={content}
              onChange={(event) => {
                onContentChange(event.target.value);
                if (event.target.value.trim()) onClearValidationError('videoContent');
              }}
              placeholder={t('editor.placeholderShort')}
            />
          </Form.Control>
        </PostFormField>
        <PostFormField
          name="videoUrl"
          label={t('editor.video')}
          required
          invalid={videoInvalid}
          message="请上传一个视频"
          hiddenValue={videoUrl.trim()}
          className="mt-4"
        >
          <UploadField
            kind='video'
            value={videoUrl ? [videoUrl] : []}
            onChange={(arr) => {
              const next = arr[0] ?? '';
              onVideoUrlChange(next);
              if (next) onClearValidationError('videoUrl');
            }}
            max={1}
          />
        </PostFormField>
      </>
    );
  }

  if (type === 'vote') {
    const contentInvalid = validationErrors.has('voteContent');
    const optionsInvalid = validationErrors.has('voteOptions');
    const deadlineInvalid = validationErrors.has('voteDeadline');
    const validOptions = voteOptions.filter((option) => option.trim()).join(',');
    return (
      <>
        <PostFormField name="voteContent" label="投票说明" required invalid={contentInvalid} message="请填写投票说明">
          <Form.Control asChild>
            <Textarea
              required
              className='min-h-[80px] !text-base leading-7'
              error={contentInvalid}
              value={content}
              onChange={(event) => {
                onContentChange(event.target.value);
                if (event.target.value.trim()) onClearValidationError('voteContent');
              }}
              placeholder={t('editor.voteQuestion')}
            />
          </Form.Control>
        </PostFormField>
        <PostFormField
          name="voteOptions"
          label={t('editor.vote')}
          required
          invalid={optionsInvalid}
          message="请至少填写 2 个投票选项"
          hiddenValue={validOptions}
          className="mt-4"
        >
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
                  error={optionsInvalid}
                  disabled={voteOptionsLocked}
                  onChange={(event) => {
                    const next = [...voteOptions];
                    next[index] = event.target.value;
                    onVoteOptionsChange(next);
                    if (next.filter((item) => item.trim()).length >= 2) onClearValidationError('voteOptions');
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
        </PostFormField>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Form.Field name="voteMulti">
            <Form.Label className="mb-1.5 block text-sm font-semibold text-ink-800">{t('editor.voteMulti')}</Form.Label>
            <label className='flex h-10 items-center gap-2 text-sm'>
              <Form.Control asChild>
                <input
                  type='checkbox'
                  checked={voteMulti}
                  onChange={(event) => onVoteMultiChange(event.target.checked)}
                  className='h-4 w-4 accent-leaf-500'
                />
              </Form.Control>
              {t('editor.voteMulti')}
            </label>
          </Form.Field>
          <PostFormField name="voteDeadline" label={t('editor.voteDeadline')} required invalid={deadlineInvalid} message="请选择投票截止时间">
            <Form.Control asChild>
              <Input
                required
                type='datetime-local'
                value={voteDeadline}
                error={deadlineInvalid}
                onChange={(event) => {
                  onVoteDeadlineChange(event.target.value);
                  if (event.target.value) onClearValidationError('voteDeadline');
                }}
              />
            </Form.Control>
          </PostFormField>
        </div>
      </>
    );
  }

  if (type === 'event') {
    const contentInvalid = validationErrors.has('eventContent');
    const locationInvalid = validationErrors.has('eventLocation');
    const startInvalid = validationErrors.has('eventStartAt');
    return (
      <>
        <PostFormField
          name="eventContent"
          label="活动介绍"
          required
          invalid={contentInvalid}
          message="请填写活动介绍"
          hiddenValue={hasRichContent(contentJson) ? 'ok' : ''}
        >
          <RichTextEditor
            value={contentJson}
            onChange={(value) => {
              onContentJsonChange(value);
              onClearValidationError('eventContent');
            }}
            placeholder={t('editor.event')}
            minHeight={460}
            charLimit={5000}
            className={cn("rounded-xl", contentInvalid && "ring-2 ring-rose-100")}
          />
        </PostFormField>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <PostFormField name="eventLocation" label={t('editor.eventLocation')} required invalid={locationInvalid} message="请填写活动地点">
            <Form.Control asChild>
              <Input
                required
                value={eventLocation}
                error={locationInvalid}
                onChange={(event) => {
                  onEventLocationChange(event.target.value);
                  if (event.target.value.trim()) onClearValidationError('eventLocation');
                }}
                placeholder={t('editor.eventLocation')}
              />
            </Form.Control>
          </PostFormField>
          <PostFormField name="eventStartAt" label={t('editor.eventStartAt')} required invalid={startInvalid} message="请选择活动开始时间">
            <Form.Control asChild>
              <Input
                required
                type='datetime-local'
                value={eventStartAt}
                error={startInvalid}
                onChange={(event) => {
                  onEventStartAtChange(event.target.value);
                  if (event.target.value) onClearValidationError('eventStartAt');
                }}
              />
            </Form.Control>
          </PostFormField>
        </div>
      </>
    );
  }

  if (type === 'journal') {
    return (
      <PostFormField
        name="journalEntries"
        label="成长记录"
        required
        invalid={validationErrors.has('journalEntries')}
        message="请至少添加一条成长记录"
        hiddenValue={journal.entries.length > 0 ? 'ok' : ''}
      >
        <JournalEditor value={journal} onChange={onJournalChange} validationErrors={validationErrors} />
      </PostFormField>
    );
  }

  return null;
}

function PostFormField({
  name,
  label,
  required,
  invalid,
  message,
  hiddenValue,
  className,
  children,
}: {
  name: string;
  label: ReactNode;
  required?: boolean;
  invalid?: boolean;
  message?: string;
  hiddenValue?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Form.Field name={name} serverInvalid={invalid} className={className}>
      <Form.Label className="mb-1.5 block text-sm font-semibold text-ink-800">
        {required && <span className="text-rose-500">*</span>} {label}
      </Form.Label>
      {hiddenValue !== undefined && (
        <Form.Control
          value={hiddenValue}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      )}
      {children}
      {message && (
        <Form.Message
          match="valueMissing"
          forceMatch={invalid}
          className="mt-1.5 block text-xs text-rose-600"
        >
          {message}
        </Form.Message>
      )}
    </Form.Field>
  );
}

function hasRichContent(json: unknown) {
  return countTextFromJson(json) > 0 || extractImagesFromJson(json).length > 0;
}

function extractImagesFromJson(json: unknown): string[] {
  const images: string[] = [];
  const traverse = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as {
      type?: string;
      attrs?: { src?: string } | null;
      content?: unknown[];
    };
    if (n.type === 'image' && typeof n.attrs?.src === 'string' && n.attrs.src) {
      images.push(n.attrs.src);
    }
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return images;
}

function countTextFromJson(json: unknown): number {
  let count = 0;
  const traverse = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === 'string') count += n.text.trim().length;
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return count;
}
