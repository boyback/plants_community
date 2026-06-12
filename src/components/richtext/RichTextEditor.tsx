'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import { Toolbar } from './Toolbar';
import { getEditorExtensions } from "@/lib/tiptap-extensions";
import { cn } from '@/lib/utils';
import styles from './RichTextEditor.module.scss';
import { cx } from '@/lib/style-utils';



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
  autoFocus









}: {value?: unknown;defaultValue?: unknown;onChange?: (json: unknown) => void;placeholder?: string;charLimit?: number;minHeight?: number;className?: string;autoFocus?: boolean;}) {
  const editor = useEditor({
    extensions: getEditorExtensions({ placeholder, charLimit }),
    content: value ?? defaultValue ?? '',
    immediatelyRender: false, // 避免 SSR hydration 警告
    onUpdate({ editor }) {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: cn(cx("prose-article", styles.r_a7e00547, styles.r_df37b1fd, styles.r_f0faeb26, styles.r_1b2d54a3, styles.r_4ee73492, styles.r_7eff2faf, styles.r_399e11a5), styles.r_55d048eb


        )
      }
    }
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
      className={cn(cx(styles.r_2cd02d11, styles.r_ca6bcd4b, styles.r_691861bc, styles.r_5e10cdb8, styles.r_b29d0e9b, styles.r_38f81f91, styles.r_cfc1a9b4),

      className
      )}>

      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        style={{ minHeight }} />

      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e, styles.r_b950dda2, styles.r_88b684d2, styles.r_54720a96, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_1dc571a3, styles.r_6c4cc49e)}>
        <span>支持 Markdown 快捷键:**粗体** *斜体* # 标题 - 列表 &gt; 引用</span>
        <span className={count > limit ? styles.r_fa512798 : ''}>
          {count} / {limit}
        </span>
      </div>
    </div>);

}