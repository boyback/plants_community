import type { ReactNode } from 'react';
import type { PostType } from '@/lib/types';
import { Form } from "radix-ui";
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { UploadField } from '@/components/upload/UploadField';
import { RichTextEditor } from '@/components/richtext/RichTextEditor';
import { JournalEditor, type JournalDraft } from '@/components/post/JournalEditor';
import type { EditorT } from './types';
import { cn } from '@/lib/utils';
import styles from './PostContentFields.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  type: PostType;
  t: EditorT;
  content: string;
  onContentChange: (value: string) => void;
  contentJson: unknown;
  onContentJsonChange: (value: unknown) => void;
  images: string[];
  onImagesChange: (value: string[]) => void;
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
  images,
  onImagesChange,
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
  onClearValidationError
}: Props) {
  if (type === 'image') {
    const invalid = validationErrors.has('imageImages');
    return (
      <PostFormField
        name="imageImages"
        label="上传图片"
        required
        invalid={invalid}
        message="图文贴需要至少上传一张图片"
        hiddenValue={images.length > 0 ? 'ok' : ''}>

        <UploadField
          kind="image"
          value={images}
          onChange={(value) => {
            onImagesChange(value);
            if (value.length > 0) onClearValidationError('imageImages');
          }}
          max={9}
          className={styles.r_c79ccc8a}
          gridClassName={cn(cx(styles.r_be2e831b, styles.r_898c0bcb, styles.r_76f32b53),

          invalid && cx(styles.r_a217b4ea, styles.r_959f4a9f, styles.r_fdae7b46, styles.r_16b1efa5, styles.r_6b7b677a)
          )}
          itemClassName={cx(styles.r_b59cd297, styles.r_421ac2be, styles.r_5e10cdb8)} />

        <p className={cx(styles.r_50d0d216, styles.r_359090c2, styles.r_7054e276, styles.r_7b89cd85)}>
          适合晒图、状态记录和简单分享；图文贴不单独设置封面图。
        </p>
      </PostFormField>);

  }

  if (type === 'rich') {
    const invalid = validationErrors.has('richContent');
    return (
      <PostFormField
        name="richContent"
        label="长文内容"
        required
        invalid={invalid}
        message="长文贴需要填写正文，或至少插入一张图片"
        hiddenValue={hasRichContent(contentJson) ? 'ok' : ''}>

        <RichTextEditor
          value={contentJson}
          onChange={(value) => {
            onContentJsonChange(value);
            onClearValidationError('richContent');
          }}
          placeholder={t('editor.placeholderRich')}
          minHeight={460}
          charLimit={20000}
          className={cn(styles.r_a217b4ea, invalid && cx(styles.r_16b1efa5, styles.r_6b7b677a))} />

      </PostFormField>);

  }

  if (type === 'short') {
    const invalid = validationErrors.has('shortContent');
    return (
      <PostFormField name="shortContent" label="纯文字内容" required invalid={invalid} message="纯文字帖需要填写正文内容">
        <Form.Control asChild>
          <Textarea
            required
            className={cx(styles.r_ee15a477, styles.r_ab3a6ebd, styles.r_7eff2faf)}
            error={invalid}
            placeholder={t('editor.placeholderShort')}
            value={content}
            onChange={(event) => {
              onContentChange(event.target.value);
              if (event.target.value.trim()) onClearValidationError('shortContent');
            }}
            maxLength={500}
            showCount />

        </Form.Control>
      </PostFormField>);

  }

  if (type === 'help') {
    const invalid = validationErrors.has('helpContent');
    return (
      <>
        <PostFormField name="helpContent" label="求助描述（细节）" required invalid={invalid} message="请描述问题现象、养护环境或已尝试的方法">
          <Form.Control asChild>
            <Textarea
              required
              className={cx(styles.r_ee15a477, styles.r_ab3a6ebd, styles.r_7eff2faf)}
              error={invalid}
              placeholder="例如：叶片发软多久了、最近浇水/光照/通风情况、是否翻盆或用药。"
              value={content}
              onChange={(event) => {
                onContentChange(event.target.value);
                if (event.target.value.trim()) onClearValidationError('helpContent');
              }}
              maxLength={2000}
              showCount />

          </Form.Control>
        </PostFormField>
        <PostFormField name="helpImages" label="上传图片">
          <UploadField
            kind="image"
            value={images}
            onChange={onImagesChange}
            max={9}
            className={styles.r_c79ccc8a}
            gridClassName={cx(styles.r_be2e831b, styles.r_898c0bcb, styles.r_76f32b53)}
            itemClassName={cx(styles.r_b59cd297, styles.r_421ac2be, styles.r_5e10cdb8)} />
        </PostFormField>
      </>);

  }

  if (type === 'video') {
    const videoInvalid = validationErrors.has('videoUrl');
    return (
      <PostFormField
        name="videoUrl"
        label={t('editor.video')}
        required
        invalid={videoInvalid}
        message="请上传一个视频"
        hiddenValue={videoUrl.trim()}>

        <UploadField
          kind="video"
          value={videoUrl ? [videoUrl] : []}
          onChange={(arr) => {
            const next = arr[0] ?? '';
            onVideoUrlChange(next);
            if (next) onClearValidationError('videoUrl');
          }}
          max={1}
          gridClassName={cn(videoInvalid && cx(styles.r_16b1efa5, styles.r_6b7b677a))}
          itemClassName={cx(styles.r_25245f7e, styles.r_0595c69e)} />

      </PostFormField>);

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
              className={cx(styles.r_dd9ce2a7, styles.r_ab3a6ebd, styles.r_7eff2faf)}
              error={contentInvalid}
              value={content}
              onChange={(event) => {
                onContentChange(event.target.value);
                if (event.target.value.trim()) onClearValidationError('voteContent');
              }}
              placeholder={t('editor.voteQuestion')} />

          </Form.Control>
        </PostFormField>
        <PostFormField
          name="voteOptions"
          label={t('editor.vote')}
          required
          invalid={optionsInvalid}
          message="请至少填写 2 个投票选项"
          hiddenValue={validOptions}
          className={styles.r_0ab86672}>

          <div className={styles.r_6f7e013d}>
            {voteOptionsLocked &&
            <div className={cx(styles.r_421ac2be, styles.r_67d2289d, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_359090c2, styles.r_85d79ebf)}>
                已有人投票，投票选项不能再编辑。
              </div>
            }
            {voteOptions.map((option, index) =>
            <div key={index} className={cx(styles.r_60fbb771, styles.r_77a2a20e)}>
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
                placeholder={`${t('editor.voteAddOption')} ${index + 1}`} />

                {voteOptions.length > 2 &&
              <button
                type='button'
                className={styles.r_23b4e5ed}
                disabled={voteOptionsLocked}
                onClick={() => onVoteOptionsChange(voteOptions.filter((_, i) => i !== index))}>

                    <Icon name='trash' size={14} />
                  </button>
              }
              </div>
            )}
            {!voteOptionsLocked && voteOptions.length < 8 &&
            <button
              type='button'
              className={styles.r_dd702538}
              onClick={() => onVoteOptionsChange([...voteOptions, ''])}>

                <Icon name='plus' size={14} />
                {t('editor.voteAddOption')}
              </button>
            }
          </div>
        </PostFormField>
        <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_e4d6f343)}>
          <Form.Field name="voteMulti">
            <Form.Label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>{t('editor.voteMulti')}</Form.Label>
            <label className={cx(styles.r_60fbb771, styles.r_426b8b75, styles.r_3960ffc2, styles.r_77a2a20e, styles.r_fc7473ca)}>
              <Form.Control asChild>
                <input
                  type='checkbox'
                  checked={voteMulti}
                  onChange={(event) => onVoteMultiChange(event.target.checked)}
                  className={cx(styles.r_11e59c6d, styles.r_dc7972eb, styles.r_5f66c7c0)} />

              </Form.Control>
              {t('editor.voteMulti')}
            </label>
          </Form.Field>
          <PostFormField name="voteDeadline" label={t('editor.voteDeadline')} required invalid={deadlineInvalid} message="请选择投票截止时间">
            <Form.Control asChild>
              <Input
                required
                type="datetime-local"
                value={voteDeadline}
                error={deadlineInvalid}
                onChange={(event) => {
                  onVoteDeadlineChange(event.target.value);
                  if (event.target.value) onClearValidationError('voteDeadline');
                }} />

            </Form.Control>
          </PostFormField>
        </div>
      </>);

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
          hiddenValue={hasRichContent(contentJson) ? 'ok' : ''}>

          <RichTextEditor
            value={contentJson}
            onChange={(value) => {
              onContentJsonChange(value);
              onClearValidationError('eventContent');
            }}
            placeholder={t('editor.event')}
            minHeight={460}
            charLimit={5000}
            className={cn(styles.r_a217b4ea, contentInvalid && cx(styles.r_16b1efa5, styles.r_6b7b677a))} />

        </PostFormField>
        <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_d7c83398, styles.r_0c3bc985, styles.r_e4d6f343)}>
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
                placeholder={t('editor.eventLocation')} />

            </Form.Control>
          </PostFormField>
          <PostFormField name="eventStartAt" label={t('editor.eventStartAt')} required invalid={startInvalid} message="请选择活动开始时间">
            <Form.Control asChild>
              <Input
                required
                type="datetime-local"
                value={eventStartAt}
                error={startInvalid}
                onChange={(event) => {
                  onEventStartAtChange(event.target.value);
                  if (event.target.value) onClearValidationError('eventStartAt');
                }} />

            </Form.Control>
          </PostFormField>
        </div>
      </>);

  }

  if (type === 'journal') {
    return (
      <PostFormField
        name="journalEntries"
        label="记录贴"
        required
        invalid={validationErrors.has('journalEntries')}
        message="请至少添加一条记录"
        hiddenValue={journal.entries.length > 0 ? 'ok' : ''}>

        <JournalEditor value={journal} onChange={onJournalChange} validationErrors={validationErrors} />
      </PostFormField>);

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
  children









}: {name: string;label: ReactNode;required?: boolean;invalid?: boolean;message?: string;hiddenValue?: string;className?: string;children: ReactNode;}) {
  return (
    <Form.Field name={name} serverInvalid={invalid} className={className}>
      <Form.Label className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
        {required && <span className={styles.r_fa512798}>*</span>} {label}
      </Form.Label>
      {hiddenValue !== undefined &&
      <Form.Control
        value={hiddenValue}
        required={required}
        readOnly
        tabIndex={-1}
        aria-hidden
        className={styles.r_2daa8e5e} />

      }
      {children}
      {message &&
      <Form.Message
        match="valueMissing"
        forceMatch={invalid}
        className={cx(styles.r_aac62f0e, styles.r_0214b4b3, styles.r_359090c2, styles.r_595fceba)}>

          {message}
        </Form.Message>
      }
    </Form.Field>);

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
      attrs?: {src?: string;} | null;
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
    const n = node as {text?: string;content?: unknown[];};
    if (typeof n.text === 'string') count += n.text.trim().length;
    if (Array.isArray(n.content)) n.content.forEach(traverse);
  };
  traverse(json);
  return count;
}
