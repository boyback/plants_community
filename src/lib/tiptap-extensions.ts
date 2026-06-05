import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension, mergeAttributes } from '@tiptap/core';
import Gapcursor from '@tiptap/extension-gapcursor';

const ListMarkerColor = Extension.create({
  name: 'listMarkerColor',
  addGlobalAttributes() {
    return [
      {
        types: ['listItem'],
        attributes: {
          markerColor: {
            default: null,
            parseHTML: (element) => element.style.getPropertyValue('--rte-marker-color') || null,
            renderHTML: (attributes) => {
              if (!attributes.markerColor) return {};
              return { style: `--rte-marker-color: ${attributes.markerColor};` };
            },
          },
        },
      },
    ];
  },
});

const DEFAULT_IMAGE_WIDTH = 'auto';
const MIN_IMAGE_WIDTH_PERCENT = 25;
const MAX_IMAGE_WIDTH_PERCENT = 100;

function normalizeImageWidth(value: unknown): string | null {
  if (value === 'auto') return 'auto';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, value))}%`;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const percent = trimmed.match(/^(\d+(?:\.\d+)?)%$/);
  if (percent) {
    const next = Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Number(percent[1])));
    return `${Number(next.toFixed(1))}%`;
  }
  const px = trimmed.match(/^(\d+(?:\.\d+)?)px$/);
  if (px) return trimmed;
  const rawNumber = trimmed.match(/^(\d+(?:\.\d+)?)$/);
  if (rawNumber) {
    return `${Math.min(MAX_IMAGE_WIDTH_PERCENT, Math.max(MIN_IMAGE_WIDTH_PERCENT, Number(rawNumber[1])))}%`;
  }
  return null;
}

function mergeImageStyle(style: unknown, width: string): string {
  const styleText = typeof style === 'string' ? style : '';
  const preserved = styleText
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^(width|max-width|height|display|margin)\s*:/i.test(item));
  return [
    ...preserved,
    width === 'auto' ? 'width: auto' : `width: ${width}`,
    'max-width: 100%',
    'height: auto',
    'display: block',
  ].join('; ');
}

const RichImage = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      width: {
        default: DEFAULT_IMAGE_WIDTH,
        parseHTML: (element) =>
          normalizeImageWidth(
            element.getAttribute('data-width') || element.style.width || element.getAttribute('width'),
          ) ?? DEFAULT_IMAGE_WIDTH,
        renderHTML: () => ({}),
      },
      height: {
        default: null,
        renderHTML: () => ({}),
      },
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: () => ({}),
      },
      caption: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-caption') || null,
        renderHTML: () => ({}),
      },
      layout: {
        default: 'natural',
        parseHTML: (element) => element.getAttribute('data-layout') || 'natural',
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const width = DEFAULT_IMAGE_WIDTH;
    const layout = typeof node.attrs.layout === 'string' ? node.attrs.layout : 'natural';
    const { width: _width, height: _height, align: _align, caption: _caption, layout: _layout, style, ...rest } =
      HTMLAttributes;

    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, rest, {
        'data-width': width,
        'data-layout': layout,
        style: mergeImageStyle(style, width),
      }),
    ];
  },

  addNodeView() {
    if (typeof document === 'undefined') return null;

    return ({ node, editor, getPos, HTMLAttributes }) => {
      let currentNode = node;
      const wrapper = document.createElement('span');
      const img = document.createElement('img');
      const deleteButton = document.createElement('button');

      wrapper.className = 'rte-editor-image';
      wrapper.contentEditable = 'false';

      deleteButton.type = 'button';
      deleteButton.className = 'rte-editor-image__delete';
      deleteButton.title = '删除图片';
      deleteButton.setAttribute('aria-label', '删除图片');
      deleteButton.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" class="ZDI ZDI--Xmark24" fill="currentColor"><path d="M5.619 4.381A.875.875 0 1 0 4.38 5.62L10.763 12 4.38 18.381A.875.875 0 1 0 5.62 19.62L12 13.237l6.381 6.382a.875.875 0 1 0 1.238-1.238L13.237 12l6.382-6.381A.875.875 0 0 0 18.38 4.38L12 10.763 5.619 4.38Z"></path></svg>';

      function applyImageAttributes(attrs: Record<string, unknown>) {
        Array.from(img.attributes).forEach((attr) => img.removeAttribute(attr.name));
        Object.entries(attrs).forEach(([key, value]) => {
          if (
            value == null ||
            key === 'width' ||
            key === 'height' ||
            key === 'style' ||
            key === 'data-width' ||
            key === 'align' ||
            key === 'caption' ||
            key === 'layout'
          ) {
            return;
          }
          img.setAttribute(key, String(value));
        });
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }

      applyImageAttributes(HTMLAttributes);
      wrapper.append(img, deleteButton);

      deleteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos !== 'number') return;
        editor.chain().focus().deleteRange({ from: pos, to: pos + currentNode.nodeSize }).run();
      });

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          applyImageAttributes(updatedNode.attrs);
          return true;
        },
        selectNode() {
          wrapper.classList.add('ProseMirror-selectednode');
        },
        deselectNode() {
          wrapper.classList.remove('ProseMirror-selectednode');
        },
        stopEvent(event: Event) {
          const target = event.target as HTMLElement | null;
          return Boolean(target?.closest('.rte-editor-image__delete'));
        },
      };
    };
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
  RichImage.configure({
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
      placeholder: opts?.placeholder ?? '从这里开始书写，支持加粗 / 标题 / 列表 / 引用 / 链接 / 插图...',
    }),
    CharacterCount.configure({
      limit: opts?.charLimit ?? 50000,
    }),
  ];
}
