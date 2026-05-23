/**
 * TipTap 扩展配置
 *
 * - 服务端用 `getServerExtensions()` 渲染 JSON → HTML(generateHTML)
 * - 客户端编辑器用 `getEditorExtensions()` 注册编辑能力(含 Placeholder)
 *
 * 两套扩展必须保持节点 schema 完全一致,否则服务端渲染会报错。
 */

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Gapcursor from '@tiptap/extension-gapcursor'
/**
 * StarterKit 在 v3+ 已内置 link + underline 等。
 * 我们用 configure 关闭它内置的 link(因为我们要自定义 HTMLAttributes / rel),
 * 然后单独再注册一份 Link;underline 直接用 StarterKit 提供的。
 */

const ListMarkerColor = Extension.create({
  name: 'listMarkerColor',
  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          markerColor: {
            default: null,
            parseHTML: (element) =>
              element.style.getPropertyValue('--rte-marker-color') || null,
            renderHTML: (attributes) => {
              if (!attributes.markerColor) return {};
              return {
                style: `--rte-marker-color: ${attributes.markerColor};`,
              };
            },
          },
        },
      },
    ];
  },
});

const baseExtensions = [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3],
      HTMLAttributes: { class: 'mt-5 mb-2 font-semibold text-ink-800' },
    },
    codeBlock: false,
    horizontalRule: { HTMLAttributes: { class: 'my-4 border-leaf-100' } },
    bulletList: { HTMLAttributes: { class: 'list-disc ml-5' } },
    orderedList: { HTMLAttributes: { class: 'list-decimal ml-5' } },
    blockquote: {
      HTMLAttributes: {
        class: 'border-l-4 border-leaf-300 bg-leaf-50/60 pl-3 py-1 italic text-ink-700/80 my-3',
      },
    },
    code: { HTMLAttributes: { class: 'rounded bg-leaf-50 px-1 py-0.5 text-[0.9em] text-leaf-700' } },
    // 关掉 link,自己 configure
    link: false,
  } as never),
  Link.configure({
    openOnClick: false,
    autolink: true,
    HTMLAttributes: {
      class: 'text-leaf-700 underline underline-offset-2',
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    },
  }),
  Image.configure({
    HTMLAttributes: {
      // style: 'max-width: 50%;height: auto;margin: 0 auto; display:block;border-radius: 0px;padding: 20px;outline: 0px;',
    },
    inline: false,
    allowBase64: false,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  TextStyle,
  Color.configure({
    types: ['textStyle'],
  }),
  ListMarkerColor,
  Highlight.configure({
    multicolor: false,
  }),
  Gapcursor,
];

export function getServerExtensions() {
  return baseExtensions;
}

export function getEditorExtensions(opts?: { placeholder?: string; charLimit?: number }) {
  return [
    ...baseExtensions,
    Placeholder.configure({
      placeholder: opts?.placeholder ?? '从这里开始书写,试试加粗 / 标题 / 列表 / 引用 / 链接 / 插图...',
    }),
    CharacterCount.configure({
      limit: opts?.charLimit ?? 50000,
    }),
  ];
}
