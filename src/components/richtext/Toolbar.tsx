"use client";

import { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { MultiImageUploadGrid, type MultiImageUploadGridHandle } from "@/components/upload/MultiImageUploadGrid";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "@/components/ui/Toast";

const TEXT_COLOR_OPTIONS = [
  { name: "默认", value: null, swatch: "#1f2937" },
  { name: "绿色", value: "#2f7d52", swatch: "#2f7d52" },
  { name: "红色", value: "#dc2626", swatch: "#dc2626" },
  { name: "橙色", value: "#ea580c", swatch: "#ea580c" },
  { name: "蓝色", value: "#2563eb", swatch: "#2563eb" },
  { name: "紫色", value: "#7c3aed", swatch: "#7c3aed" },
  { name: "灰色", value: "#64748b", swatch: "#64748b" },
] as const;

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
      <div className='flex items-center gap-1 border-b border-leaf-100 bg-leaf-50/30 px-2 py-1.5 text-xs text-leaf-700/60'>
        {t("editor.toolbar.loading")}
      </div>
    );
  }

  return (
    <div className='flex flex-wrap items-center gap-0.5 border-b border-leaf-100 bg-leaf-50/30 px-1.5 py-1.5'>
      <Group>
        <ToolBtn
          title={t("editor.toolbar.bold")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <span className='font-bold'>B</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.italic")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <span className='italic'>I</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.underline")}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <span className='underline'>U</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.strike")}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <span className='line-through'>S</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.code")}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <span className='font-mono text-[11px]'>{"<>"}</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.h1")}
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <span className='text-[11px] font-bold'>H1</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.h2")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <span className='text-[11px] font-bold'>H2</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.h3")}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <span className='text-[11px] font-bold'>H3</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.bulletList")}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.orderedList")}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.
        </ToolBtn>
        <MarkerColorPicker editor={editor} />
        <ToolBtn
          title={t("editor.toolbar.blockquote")}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <span className='text-[12px]'>❝</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.hr")}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ─
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title='左对齐'
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignIcon align='left' />
        </ToolBtn>
        <ToolBtn
          title='居中'
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignIcon align='center' />
        </ToolBtn>
        <ToolBtn
          title='右对齐'
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignIcon align='right' />
        </ToolBtn>
        <ToolBtn
          title='高亮'
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          🖍
        </ToolBtn>
        <TextColorPicker editor={editor} />
      </Group>

      <Divider />

      <Group>
        <InsertToolBtn
          title={t("editor.toolbar.link")}
          label='链接'
          icon='link'
          active={editor.isActive("link")}
          onClick={() => setLinkOpen(true)}
        />
        <InsertToolBtn
          title={t("editor.toolbar.image")}
          label='图片'
          icon='image'
          onClick={() => setImageOpen(true)}
        />
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.undo")}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Icon name='arrow-right' size={13} className='-scale-x-100' />
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.redo")}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Icon name='arrow-right' size={13} />
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.clear")}
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
          onInsert={(urls) => {
            editor
              .chain()
              .focus()
              .insertContent([
                ...urls.map((url) => ({
                  type: "image",
                  attrs: { src: url },
                })),
                {
                  type: "paragraph",
                },
              ])
              .run();
            setImageOpen(false);
          }}
        />
      )}

      {linkOpen && (
        <LinkDialog
          initial={editor.getAttributes("link")?.href ?? ""}
          onCancel={() => setLinkOpen(false)}
          onInsert={(url) => {
            if (!url) {
              editor.chain().focus().unsetLink().run();
            } else {
              editor
                .chain()
                .focus()
                .extendMarkRange("link")
                .setLink({ href: url })
                .run();
            }
            setLinkOpen(false);
          }}
        />
      )}
    </div>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className='flex items-center gap-0.5'>{children}</div>;
}

function Divider() {
  return <span className='mx-0.5 h-5 w-px bg-leaf-100' />;
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
      type='button'
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-sm transition-colors",
        active ? "bg-leaf-100 text-leaf-800" : "text-ink-700 hover:bg-leaf-50",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function InsertToolBtn({
  title,
  label,
  icon,
  active,
  onClick,
}: {
  title: string;
  label: string;
  icon: "link" | "image";
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1 rounded border px-2 text-[12px] font-medium transition-colors',
        active
          ? 'border-leaf-300 bg-leaf-100 text-leaf-800'
          : 'border-leaf-100 bg-white/70 text-ink-700 hover:border-leaf-300 hover:bg-white hover:text-leaf-800',
      )}
    >
      <Icon name={icon} size={14} strokeWidth={1.9} />
      <span>{label}</span>
    </button>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const lineClass =
    align === "left"
      ? "items-start"
      : align === "right"
        ? "items-end"
        : "items-center";

  return (
    <span className={cn("flex w-4 flex-col gap-[3px]", lineClass)}>
      <span className='h-px w-4 rounded bg-current' />
      <span className='h-px w-3 rounded bg-current' />
      <span className='h-px w-4 rounded bg-current' />
    </span>
  );
}

function TextColorPicker({ editor }: { editor: Editor }) {
  const currentColor = (
    editor.getAttributes("textStyle")?.color as string | undefined
  )?.toLowerCase();
  const customColorValue = /^#[0-9a-f]{6}$/i.test(currentColor ?? "")
    ? currentColor!
    : "#2f7d52";
  const isPresetColor = TEXT_COLOR_OPTIONS.some(
    (color) => color.value?.toLowerCase() === currentColor,
  );
  const isCustomColor = Boolean(currentColor && !isPresetColor);
  const applyColor = (color: string | null) => {
    const chain = editor.chain().focus();
    if (color) {
      chain.setColor(color);
    } else {
      chain.unsetColor();
    }
    chain.run();
  };

  return (
    <div className='ml-0.5 flex h-7 items-center gap-0.5 rounded bg-white/60 px-1'>
      <span className='mr-0.5 text-[11px] font-semibold text-ink-700' title='文字颜色'>
        A
      </span>
      {TEXT_COLOR_OPTIONS.map((color) => {
        const active = color.value
          ? currentColor === color.value.toLowerCase()
          : !currentColor;

        return (
          <button
            key={color.name}
            type='button'
            title={`文字颜色：${color.name}`}
            aria-label={`文字颜色：${color.name}`}
            onClick={() => {
              applyColor(color.value);
            }}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border transition-colors hover:border-leaf-500',
              active ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-100 bg-white',
            )}
          >
            {color.value ? (
              <span
                className='h-3 w-3 rounded-sm'
                style={{ backgroundColor: color.swatch }}
              />
            ) : (
              <span className='relative h-3 w-3 rounded-sm border border-ink-300 bg-white'>
                <span className='absolute left-[-1px] top-1/2 h-px w-[15px] -rotate-45 bg-rose-500' />
              </span>
            )}
          </button>
        );
      })}
      <label
        title='自定义文字颜色'
        aria-label='自定义文字颜色'
        className={cn(
          'relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded border transition-colors hover:border-leaf-500',
          isCustomColor ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-100 bg-white',
        )}
      >
        <input
          type='color'
          value={customColorValue}
          onChange={(event) => {
            applyColor(event.currentTarget.value);
          }}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
        />
        <span
          className='h-3 w-3 rounded-sm'
          style={{
            background:
              'conic-gradient(#dc2626, #ea580c, #facc15, #2f7d52, #2563eb, #7c3aed, #dc2626)',
          }}
        />
      </label>
    </div>
  );
}

function MarkerColorPicker({ editor }: { editor: Editor }) {
  const isListItem = editor.isActive("listItem");
  const currentColor = (
    editor.getAttributes("listItem")?.markerColor as string | undefined
  )?.toLowerCase();
  const customColorValue = /^#[0-9a-f]{6}$/i.test(currentColor ?? "")
    ? currentColor!
    : "#2f7d52";
  const isPresetColor = TEXT_COLOR_OPTIONS.some(
    (color) => color.value?.toLowerCase() === currentColor,
  );
  const isCustomColor = Boolean(currentColor && !isPresetColor);

  const applyMarkerColor = (color: string | null) => {
    if (!isListItem) {
      toast.error("请先把光标放到列表项里");
      return;
    }
    editor.chain().focus().updateAttributes("listItem", { markerColor: color }).run();
  };

  return (
    <div
      className={cn(
        'ml-0.5 flex h-7 items-center gap-0.5 rounded bg-white/60 px-1',
        !isListItem && 'opacity-50',
      )}
      title='列表标记颜色'
    >
      <span className='mr-0.5 text-[13px] font-semibold leading-none text-ink-700'>
        •
      </span>
      {TEXT_COLOR_OPTIONS.map((color) => {
        const active = color.value
          ? currentColor === color.value.toLowerCase()
          : !currentColor;

        return (
          <button
            key={color.name}
            type='button'
            title={`列表标记颜色：${color.name}`}
            aria-label={`列表标记颜色：${color.name}`}
            onClick={() => applyMarkerColor(color.value)}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border transition-colors hover:border-leaf-500',
              active && isListItem ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-100 bg-white',
            )}
          >
            {color.value ? (
              <span
                className='h-3 w-3 rounded-sm'
                style={{ backgroundColor: color.swatch }}
              />
            ) : (
              <span className='relative h-3 w-3 rounded-sm border border-ink-300 bg-white'>
                <span className='absolute left-[-1px] top-1/2 h-px w-[15px] -rotate-45 bg-rose-500' />
              </span>
            )}
          </button>
        );
      })}
      <label
        title='自定义列表标记颜色'
        aria-label='自定义列表标记颜色'
        className={cn(
          'relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded border transition-colors hover:border-leaf-500',
          isCustomColor && isListItem ? 'border-leaf-600 bg-leaf-50' : 'border-leaf-100 bg-white',
        )}
      >
        <input
          type='color'
          value={customColorValue}
          onClick={(event) => {
            if (!isListItem) event.preventDefault();
          }}
          onChange={(event) => {
            applyMarkerColor(event.currentTarget.value);
          }}
          className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
        />
        <span
          className='h-3 w-3 rounded-sm'
          style={{
            background:
              'conic-gradient(#dc2626, #ea580c, #facc15, #2f7d52, #2563eb, #7c3aed, #dc2626)',
          }}
        />
      </label>
    </div>
  );
}

const MAX_IMAGE_UPLOAD_COUNT = 20;

function ImageDialog({
  onInsert,
  onCancel,
}: {
  onInsert: (urls: Array<string>) => void;
  onCancel: () => void;
}) {
  const [uploadedUrls, setUploadedUrls] = useState<Array<string>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const uploadGridRef = useRef<MultiImageUploadGridHandle>(null);
  const isInitialEmpty = uploadedUrls.length === 0 && !isUploading;

  const handleInsertRich = () => {
    if (uploadedUrls.length === 0) {
      toast.error(isUploading ? "图片上传中" : "请先上传图片");
      return;
    }
    onInsert(uploadedUrls);
  };

  const handleCancel = () => {
    if (isUploading) {
      setCloseConfirmOpen(true);
      return;
    }
    onCancel();
  };

  return (
    <div
      className='fixed inset-0 z-[60] grid place-items-center bg-ink-900/40 p-4'
      onClick={handleCancel}
    >
      <div
        className='card relative flex min-h-[400px] w-[500px] flex-col p-4'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type='button'
          onClick={handleCancel}
          className='absolute -right-[5%] -top-1 flex h-10 w-10 translate-x-[25px] items-center justify-center transition-opacity hover:opacity-80'
        >
          <Image src='/icons/close-circle.svg' alt='关闭' width={25} height={25} />
        </button>

        <div className='text-base font-semibold text-ink-800'>已上传的图片</div>
        {isInitialEmpty && (
          <EmptyImageUploadPrompt onClick={() => uploadGridRef.current?.openPicker()} />
        )}
        <div className={isInitialEmpty ? 'hidden' : 'mt-3 flex-1'}>
          <MultiImageUploadGrid
            ref={uploadGridRef}
            value={uploadedUrls}
            onChange={setUploadedUrls}
            max={MAX_IMAGE_UPLOAD_COUNT}
            onUploadingChange={setIsUploading}
            showCount={false}
            gridClassName='grid-cols-5 gap-1'
            tileClassName='h-[90px] w-[90px]'
            hideAddButton={isInitialEmpty}
            showAddWhileUploading
            squareTiles
            squareAddButton
            className='flex h-full flex-col'
            helpTextClassName='!mt-auto pt-2'
            helpText={
              <>
                <div>最多上传 20 张，单张不超过 10 MB，可一次选择多张</div>
                <div>仅支持 jpg / png / webp / gif / heic</div>
              </>
            }
          />
        </div>

        <div className='mt-auto flex justify-end pt-4'>
          <button
            type='button'
            onClick={handleInsertRich}
            disabled={uploadedUrls.length === 0}
            className={cn(
              'btn-primary',
              uploadedUrls.length === 0 && 'cursor-not-allowed opacity-50',
            )}
          >
            确认
          </button>
        </div>
        {closeConfirmOpen && (
          <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4'
            onClick={() => setCloseConfirmOpen(false)}
          >
            <div
              className='w-full max-w-sm bg-white p-5 shadow-xl'
              onClick={(event) => event.stopPropagation()}
            >
              <div className='text-base font-semibold text-ink-800'>关闭上传弹窗？</div>
              <p className='mt-2 text-sm leading-6 text-ink-600'>
                当前还有图片正在上传，关闭后会取消未完成的上传。
              </p>
              <div className='mt-5 flex justify-end gap-2'>
                <button
                  type='button'
                  onClick={() => setCloseConfirmOpen(false)}
                  className='border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50'
                >
                  继续等待
                </button>
                <button
                  type='button'
                  onClick={onCancel}
                  className='bg-rose-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-600'
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyImageUploadPrompt({ onClick }: { onClick: () => void }) {
  return (
    <div className='pointer-events-none absolute inset-0 flex items-center justify-center p-4'>
      <div className='pointer-events-auto flex flex-col items-center gap-3 text-center'>
        <button
          type='button'
          onClick={onClick}
          className='flex h-[120px] w-[120px] flex-col items-center justify-center gap-1 border border-dashed border-leaf-200 bg-leaf-50/30 text-xs transition-colors hover:border-leaf-400 hover:bg-leaf-50/50'
        >
          <Icon name='plus' size={18} className='text-leaf-600' />
          <span className='text-[10px] text-leaf-700/70'>图片</span>
        </button>
        <div className='space-y-0.5 text-[11px] text-leaf-700/50'>
          <div>最多上传 20 张，单张不超过 10 MB，可一次选择多张</div>
          <div>仅支持 jpg / png / webp / gif / heic</div>
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
      className='fixed inset-0 z-[60] grid place-items-center bg-ink-900/40 p-4'
      onClick={onCancel}
    >
      <div
        className='card w-full max-w-md p-5'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='mb-3 text-base font-semibold'>
          {t("editor.toolbar.linkDialog.title")}
        </div>
        <div className='text-xs text-leaf-700/80 mb-1'>
          {t("editor.toolbar.linkDialog.urlLabel")}
        </div>
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder='https://...'
          className='input'
        />
        <div className='mt-4 flex justify-end gap-2'>
          {initial && (
            <button
              onClick={() => onInsert("")}
              className='btn-outline !text-xs'
            >
              {t("editor.toolbar.linkDialog.remove")}
            </button>
          )}
          <button onClick={onCancel} className='btn-outline !text-xs'>
            {t("common.cancel")}
          </button>
          <button
            onClick={() => onInsert(url.trim())}
            className='btn-primary !text-xs'
          >
            {t("editor.toolbar.linkDialog.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
