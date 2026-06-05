'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { getEditorExtensions } from '@/lib/tiptap-extensions';
import { cn } from '@/lib/utils';

/**
 * 富文本编辑器,基于 TipTap。
 *
 * 受控用法:
 *   <RichTextEditor value={json} onChange={setJson} />
 * 非受控/初始用法:
 *   <RichTextEditor defaultValue={json} onChange={...} />
 *
 * value 与 onChange 都是 ProseMirror JSON。
 */
export function RichTextEditor({
  value,
  defaultValue,
  onChange,
  placeholder,
  charLimit,
  minHeight = 200,
  className,
  autoFocus,
}: {
  value?: unknown;
  defaultValue?: unknown;
  onChange?: (json: unknown) => void;
  placeholder?: string;
  charLimit?: number;
  minHeight?: number;
  className?: string;
  autoFocus?: boolean;
}) {
  const editor = useEditor({
    extensions: getEditorExtensions({ placeholder, charLimit }),
    content: value ?? defaultValue ?? '',
    immediatelyRender: false, // 避免 SSR hydration 警告
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose-article rich-editor outline-none px-4 py-3 text-base leading-7 text-ink-800',
          'focus:outline-none'
        ),
      },
    },
  });

  // 受控:外部 value 变化时同步进编辑器(避免 onUpdate 死循环只在不一致时同步)
  useEffect(() => {
    if (!editor || value === undefined) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value as never, { emitUpdate: false } as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // 自动聚焦
  useEffect(() => {
    if (autoFocus && editor) editor.commands.focus('end');
  }, [autoFocus, editor]);

  const count = editor?.storage.characterCount?.characters?.() ?? 0;
  const limit = charLimit ?? 50000;

  return (
    <div
      className={cn(
        'overflow-hidden border border-leaf-200 bg-white focus-within:border-leaf-400 focus-within:ring-2 focus-within:ring-leaf-100',
        className
      )}
    >
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        style={{ minHeight }}
      />
      <div className="flex items-center justify-between border-t border-leaf-100 bg-leaf-50/30 px-3 py-1.5 text-[10px] text-leaf-700/60">
        <span>支持 Markdown 快捷键:**粗体** *斜体* # 标题 - 列表 &gt; 引用</span>
        <span className={count > limit ? 'text-rose-500' : ''}>
          {count} / {limit}
        </span>
      </div>
    </div>
  );
}
