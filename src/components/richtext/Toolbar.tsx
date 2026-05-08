'use client';

import { Editor } from '@tiptap/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { api, ApiError } from '@/lib/client-api';
import { useI18n } from '@/i18n/I18nContext';

/**
 * 工具栏:统一在编辑器上方,Tailwind 样式与社区其它按钮一致。
 *
 * 工具组:
 *   - 文本:加粗、斜体、下划线、删除线
 *   - 标题:H1 / H2 / H3
 *   - 列表:无序、有序
 *   - 块:引用、分隔线
 *   - 插入:链接、图片
 *   - 清除格式
 */
export function Toolbar({ editor }: { editor: Editor | null }) {
  const { t } = useI18n();
  const [imageOpen, setImageOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  if (!editor) {
    return (
      <div className="flex items-center gap-1 border-b border-leaf-100 bg-leaf-50/30 px-2 py-1.5 text-xs text-leaf-700/60">
        {t('editor.toolbar.loading')}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-leaf-100 bg-leaf-50/30 px-1.5 py-1.5">
      <Group>
        <ToolBtn
          title={t('editor.toolbar.bold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className="font-bold">B</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.italic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className="italic">I</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.underline')}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className="underline">U</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.strike')}
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className="line-through">S</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.code')}
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <span className="font-mono text-[11px]">{'<>'}</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t('editor.toolbar.h1')}
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <span className="text-[11px] font-bold">H1</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.h2')}
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <span className="text-[11px] font-bold">H2</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.h3')}
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <span className="text-[11px] font-bold">H3</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t('editor.toolbar.bulletList')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.orderedList')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.blockquote')}
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <span className="text-[12px]">❝</span>
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.hr')}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ─
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t('editor.toolbar.link')}
          active={editor.isActive('link')}
          onClick={() => setLinkOpen(true)}
        >
          🔗
        </ToolBtn>
        <ToolBtn title={t('editor.toolbar.image')} onClick={() => setImageOpen(true)}>
          🖼️
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t('editor.toolbar.undo')}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Icon name="arrow-right" size={13} className="-scale-x-100" />
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.redo')}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Icon name="arrow-right" size={13} />
        </ToolBtn>
        <ToolBtn
          title={t('editor.toolbar.clear')}
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          ✕
        </ToolBtn>
      </Group>

      {imageOpen && (
        <ImageDialog
          onCancel={() => setImageOpen(false)}
          onInsert={(url) => {
            editor.chain().focus().setImage({ src: url }).run();
            setImageOpen(false);
          }}
        />
      )}

      {linkOpen && (
        <LinkDialog
          initial={editor.getAttributes('link')?.href ?? ''}
          onCancel={() => setLinkOpen(false)}
          onInsert={(url) => {
            if (!url) {
              editor.chain().focus().unsetLink().run();
            } else {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }
            setLinkOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-leaf-100" />;
}

function ToolBtn({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-sm transition-colors',
        active
          ? 'bg-leaf-100 text-leaf-800'
          : 'text-ink-700 hover:bg-leaf-50',
        disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent'
      )}
    >
      {children}
    </button>
  );
}

/* ----------- 图片对话框:支持本地上传 + URL 输入 ----------- */
function ImageDialog({
  onInsert,
  onCancel,
}: {
  onInsert: (url: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post<{ url: string }>('/api/upload', fd);
      onInsert(r.url);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : t('editor.toolbar.imageDialog.uploadFail'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-base font-semibold">{t('editor.toolbar.imageDialog.title')}</div>

        <label className="block">
          <div className="mb-1 text-xs text-leaf-700/80">{t('editor.toolbar.imageDialog.uploadHint')}</div>
          <div
            className={cn(
              'flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-leaf-200 bg-leaf-50/30 px-4 py-8 text-sm text-leaf-700 hover:bg-leaf-50',
              uploading && 'opacity-60'
            )}
          >
            {uploading ? t('editor.toolbar.imageDialog.uploading') : t('editor.toolbar.imageDialog.dropzone')}
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>

        <div className="my-3 flex items-center gap-2 text-[11px] text-leaf-700/60">
          <span className="h-px flex-1 bg-leaf-100" />
          {t('editor.toolbar.imageDialog.or')}
          <span className="h-px flex-1 bg-leaf-100" />
        </div>

        <div>
          <div className="mb-1 text-xs text-leaf-700/80">{t('editor.toolbar.imageDialog.urlLabel')}</div>
          <div className="flex gap-2">
            <input
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
            <button
              type="button"
              disabled={!url.trim()}
              onClick={() => onInsert(url.trim())}
              className="btn-primary !px-3 !text-xs"
            >
              {t('editor.toolbar.imageDialog.insert')}
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {err}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={onCancel} className="btn-outline !text-xs">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkDialog({
  initial,
  onInsert,
  onCancel,
}: {
  initial: string;
  onInsert: (url: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [url, setUrl] = useState(initial);
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="card w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 text-base font-semibold">{t('editor.toolbar.linkDialog.title')}</div>
        <div className="text-xs text-leaf-700/80 mb-1">{t('editor.toolbar.linkDialog.urlLabel')}</div>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="input"
        />
        <div className="mt-4 flex justify-end gap-2">
          {initial && (
            <button
              onClick={() => onInsert('')}
              className="btn-outline !text-xs"
            >
              {t('editor.toolbar.linkDialog.remove')}
            </button>
          )}
          <button onClick={onCancel} className="btn-outline !text-xs">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onInsert(url.trim())}
            className="btn-primary !text-xs"
          >
            {t('editor.toolbar.linkDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
