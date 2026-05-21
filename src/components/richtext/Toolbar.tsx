'use client';

import { Editor } from '@tiptap/react';
import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { useI18n } from '@/i18n/I18nContext';
import { toast } from '@/components/ui/Toast';
import { useChunkUpload } from '@/lib/hooks/useChunkUpload';

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

/* ----------- 图片对话框:上传 → 已上传 → 确认 ----------- */
function ImageDialog({
  onInsert,
  onCancel,
}: {
  onInsert: (url: string) => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const { upload, progress, status, error, reset } = useChunkUpload();
  const [uploadedUrls, setUploadedUrls] = useState<Array<string>>  ([]);

  const isUploading = status === 'uploading' || status === 'hashing';

  const handleFile = async (file: File) => {
    const result = await upload(file, 'image');
    if (result) {
      setUploadedUrls([...uploadedUrls,result.url]);
      reset();
    } else if (error) {
      toast.error(error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-ink-900/40 p-4"
      onClick={onCancel}
    >
      
      <div
        className="card relative flex w-[500px] h-[400px] flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute -top-1 -right-[5%] translate-x-[25px] flex h-10 w-10 items-center justify-center hover:opacity-80 transition-opacity"
        >
          <Image src="/icons/close-circle.svg" alt="关闭" width={25} height={25} />
        </button>
        {(isUploading||uploadedUrls&&uploadedUrls.length) 
          ?
          <>
            <div className="text-base font-semibold text-ink-800">已上传的图片</div>
              <button
                type="button"
                style={{ width: 90, height: 30,margin:'10px 0', borderRadius: 2, display: 'inline-block', backgroundColor: '#e7e7e7', position: 'relative', border: 'none', padding: '10px 0',cursor:'pointer' }}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
                  id="up"
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) void handleFile(f); }}
                />
                <label htmlFor="up">
                  <img
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAYpJREFUWEftlsFKw0AQhmcSkjfo2ZsHD558gAriG7TgxXcIpFN6soKk7OYZvHgpmDfwYl9AwYugN/HgUyQjKw1sl2zTbCpByZ6SXXb+j39nZweh44Ed68PfBhBCvCHiJxGduTrp7ICU8p6ZR4g/ITIiGrtAOAEocQAYGYJOEI0BLOIlS2OIRgC6ODNfI+KVUta/mx7HzgCm+HQ6nUspWQEQEQoh5iVQE4idAKrElbAOoP5dIGoBbOJVAC4QWwHSND1m5pfynJXteuabDpRruhOe553Ecfxku6JbAZIkGQRBcFsUxbMpbnNAhwCAQRiGN1EUfTkB1BUWmwN1+/T12hzYFqwH6B3oHejcgTRN79Q1nUwml03uvrUOrEvoAQA8ENHSNWjVPinlBQCcM/OHXlU3CpGU8hEAhup9ryq9bYC092FFRKdlrB7AdKBsNjNmfm1jubkXEY/WjexG32gCqE5XQfzmGBNRVpkDanKxWAx931cZe7hnivc8z5ez2Wy1t+d4H4Ct+oF/AfANT5jsIWrAMzQAAAAASUVORK5CYII="
                  alt="上传"
                  style={{ width: 20, height: 20, objectFit: 'contain', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                />
                </label>
               
              </button>
              {
                isUploading && 
                  <div className="relative w-[90px] h-[90px]" style={{ border: '1px dashed #ccc' }}>
                    <img
                        src="https://minimax-algeng-chat-tts.oss-cn-wulanchabu.aliyuncs.com/ccv2%2F2026-05-21%2FMiniMax-M2.7%2F1983817541167882806%2F1f849e820d5d6c64434e895a8936309325e8f2ad6f3914667ff0a1fad1ebf962..gif?Expires=1779438767&OSSAccessKeyId=LTAI5tGLnRTkBjLuYPjNcKQ8&Signature=IICzkP9OkyQ5Mgsw3FYCsKCNMLE%3D"
                        alt="上传中"
                        className="w-full h-full object-contain"
                      />
                  </div>
              }
            {
              uploadedUrls&&uploadedUrls.length>0 && (
                <div className='grid grid-cols-5'>
                {
                  uploadedUrls.map(url=><>
                                  <div className="relative w-[90px] h-[90px]" style={{ border: '1px dashed #ccc' }}>
                  <Image src={url} alt="已上传" fill className="object-cover" />
                  <button
                    type="button"
                    // onClick={() => setUploadedUrls(null)}
                    className="absolute top-0 right-0 flex items-center justify-center text-white bg-[#9f9486]"
                    style={{ width: 20, height: 20, borderRadius: '50%', color: '#fff', background: '#9f9486', textAlign: 'center' }}
                  >
                    ×
                  </button>
                </div>

                  </>)
                }

              </div>
              ) 
            }
                            <div className="mt-auto flex justify-end">
                  <button type="button" 
                  // onClick={() => onInsert(url)} 
                  className="btn-primary">确认</button>
                </div>
          </>
          :<div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <label
                className="group flex h-[90px] w-[90px] cursor-pointer flex-col items-center justify-center gap-1 border-2 border-dashed text-xs transition-colors border-leaf-200 bg-leaf-50/30 hover:border-leaf-400 hover:bg-leaf-50/50"
              >
                <Icon name="plus" size={16} className="text-leaf-600" />
                <span className="text-[10px] text-leaf-700/70">图片</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
                  onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) void handleFile(f); }}
                />
              </label>
              <div className="text-center text-[11px] text-leaf-700/50 space-y-0.5">
                <div>单张不超过 10 MB</div>
                <div>仅支持 jpg / png / webp / gif 等文件</div>
              </div>
            </div>
          </div>
        }
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
