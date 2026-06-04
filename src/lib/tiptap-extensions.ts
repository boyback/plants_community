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

const DEFAULT_IMAGE_WIDTH = '50%';
const MIN_IMAGE_WIDTH_PERCENT = 25;
const MAX_IMAGE_WIDTH_PERCENT = 100;

const IMAGE_LAYOUT_PRESETS = [
  { key: 'natural', label: '原比例', width: '50%' },
  { key: 'full', label: '全宽显示', width: '100%' },
  { key: 'double', label: '双列', width: '50%' },
  { key: 'triple', label: '三列', width: '33%' },
  { key: 'grid', label: '九宫格', width: '33%' },
  { key: 'leftText', label: '左图右文', width: '42%', align: 'left' },
  { key: 'rightText', label: '右图左文', width: '42%', align: 'right' },
] as const;

const IMAGE_SIZE_PRESETS = [
  { key: 'none', label: '无', width: 'auto' },
  { key: 'sm', label: '小', width: '25%' },
  { key: 'md', label: '中', width: '50%' },
  { key: 'lg', label: '大', width: '75%' },
] as const;

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

function normalizeImageAlign(value: unknown): 'left' | 'center' | 'right' {
  return value === 'left' || value === 'right' || value === 'center' ? value : 'center';
}

function isFixedImageLayout(value: unknown) {
  return value === 'double' || value === 'triple' || value === 'grid';
}

function mergeImageStyle(style: unknown, width: string): string {
  const styleText = typeof style === 'string' ? style : '';
  const preserved = styleText
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => !/^(width|max-width|height)\s*:/i.test(item));
  return [
    ...preserved,
    width === 'auto' ? 'width: auto' : `width: ${width}`,
    'max-width: 100%',
    'height: auto',
  ].join('; ');
}

function imageFigureStyle(width: string, align: 'left' | 'center' | 'right'): string {
  const margin =
    align === 'left'
      ? '10px 8px 10px 0'
      : align === 'right'
        ? '10px 0 10px 8px'
        : '10px 8px 10px 0';
  return [
    'display: inline-block',
    width === 'auto' ? 'width: auto' : `width: ${width}`,
    'max-width: 100%',
    'vertical-align: top',
    `margin: ${margin}`,
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
    const width = normalizeImageWidth(node.attrs.width) ?? DEFAULT_IMAGE_WIDTH;
    const align = normalizeImageAlign(node.attrs.align);
    const caption = typeof node.attrs.caption === 'string' ? node.attrs.caption.trim() : '';
    const layout = typeof node.attrs.layout === 'string' ? node.attrs.layout : 'natural';
    const { width: _width, height: _height, align: _align, caption: _caption, layout: _layout, style, ...rest } =
      HTMLAttributes;

    return [
      'figure',
      {
        class: 'rte-image-figure',
        'data-width': width,
        'data-align': align,
        'data-layout': layout,
        ...(caption ? { 'data-caption': caption } : {}),
        style: imageFigureStyle(width, align),
      },
      [
        'img',
        mergeAttributes(this.options.HTMLAttributes, rest, {
          style: mergeImageStyle(style, '100%'),
        }),
      ],
      ...(caption ? [['figcaption', { class: 'rte-image-caption' }, caption]] : []),
    ];
  },

  addNodeView() {
    if (typeof document === 'undefined') return null;

    return ({ node, editor, getPos, HTMLAttributes }) => {
      let currentNode = node;
      let currentWidth = normalizeImageWidth(node.attrs.width) ?? DEFAULT_IMAGE_WIDTH;
      let currentAlign = normalizeImageAlign(node.attrs.align);
      let currentLayout = typeof node.attrs.layout === 'string' ? node.attrs.layout : 'natural';

      const wrapper = document.createElement('span');
      wrapper.className = 'rte-resizable-image';
      wrapper.contentEditable = 'false';

      const img = document.createElement('img');
      const toolbar = document.createElement('span');
      const panel = document.createElement('span');
      const handle = document.createElement('span');
      const label = document.createElement('span');
      const captionInput = document.createElement('input');
      const fileInput = document.createElement('input');

      toolbar.className = 'rte-resizable-image__toolbar';
      panel.className = 'rte-resizable-image__panel';
      panel.hidden = true;
      handle.className = 'rte-resizable-image__handle';
      label.className = 'rte-resizable-image__label';
      captionInput.className = 'rte-resizable-image__caption-input';
      captionInput.placeholder = '添加图片说明';
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.hidden = true;
      handle.title = '拖拽调整图片宽度';

      const commitAttrs = (attrs: Record<string, unknown>) => {
        const pos = getPos();
        if (typeof pos !== 'number') return;
        editor.chain().setNodeSelection(pos).updateAttributes('image', attrs).run();
      };

      const makeToolButton = (text: string, title: string, onClick: () => void) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.title = title;
        button.className = 'rte-resizable-image__tool';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        });
        return button;
      };

      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        fileInput.value = '';
        if (!file) return;
        toolbar.dataset.busy = '上传中';
        try {
          const { uploadFileWithProgress } = await import('@/lib/upload-client');
          const result = await uploadFileWithProgress(file);
          commitAttrs({ src: result.url });
        } catch {
          window.alert('图片替换失败，请稍后重试');
        } finally {
          delete toolbar.dataset.busy;
        }
      });

      toolbar.append(
        makeToolButton('替换', '替换图片', () => fileInput.click()),
        makeToolButton('排版', '设置图片排版', () => {
          panel.hidden = !panel.hidden;
        }),
        makeToolButton('左', '左对齐', () => {
          setAlign('left');
          commitAttrs({ align: 'left' });
        }),
        makeToolButton('中', '居中', () => {
          setAlign('center');
          commitAttrs({ align: 'center' });
        }),
        makeToolButton('右', '右对齐', () => {
          setAlign('right');
          commitAttrs({ align: 'right' });
        }),
        makeToolButton('说明', '编辑图片说明', () => captionInput.focus()),
        makeToolButton('删除', '删除图片', () => {
          const pos = getPos();
          if (typeof pos !== 'number') return;
          editor.chain().focus().deleteRange({ from: pos, to: pos + currentNode.nodeSize }).run();
        }),
        fileInput,
      );

      const layoutTitle = document.createElement('span');
      layoutTitle.className = 'rte-resizable-image__panel-title';
      layoutTitle.textContent = '选择排版方式';
      panel.appendChild(layoutTitle);

      const layoutGrid = document.createElement('span');
      layoutGrid.className = 'rte-resizable-image__panel-grid';
      IMAGE_LAYOUT_PRESETS.forEach((preset) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = preset.label;
        button.title = preset.label;
        button.className = 'rte-resizable-image__preset';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextAlign = normalizeImageAlign('align' in preset ? preset.align : currentAlign);
          setDisplayWidth(preset.width);
          setAlign(nextAlign);
          setLayout(preset.key);
          commitAttrs({ width: preset.width, align: nextAlign, layout: preset.key, height: null });
        });
        layoutGrid.appendChild(button);
      });
      panel.appendChild(layoutGrid);

      const sizeTitle = document.createElement('span');
      sizeTitle.className = 'rte-resizable-image__panel-title';
      sizeTitle.textContent = '图片尺寸';
      panel.appendChild(sizeTitle);

      const sizeRow = document.createElement('span');
      sizeRow.className = 'rte-resizable-image__size-row';
      IMAGE_SIZE_PRESETS.forEach((preset) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = preset.label;
        button.title = `图片尺寸：${preset.label}`;
        button.className = 'rte-resizable-image__size';
        button.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          setDisplayWidth(preset.width);
          commitAttrs({ width: preset.width, height: null });
        });
        sizeRow.appendChild(button);
      });
      panel.appendChild(sizeRow);

      function applyImageAttributes(attrs: Record<string, unknown>) {
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
        img.style.width = '100%';
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      }

      function setDisplayWidth(width: string) {
        currentWidth = width;
        wrapper.style.width = width;
        wrapper.dataset.width = width;
        label.textContent = width.endsWith('%') ? width.replace(/\.0%$/, '%') : width;
      }

      function setAlign(align: 'left' | 'center' | 'right') {
        currentAlign = align;
        wrapper.dataset.align = align;
        wrapper.style.marginLeft = align === 'right' || align === 'center' ? 'auto' : '0';
        wrapper.style.marginRight = align === 'left' || align === 'center' ? 'auto' : '0';
      }

      function setLayout(layout: string) {
        currentLayout = layout;
        wrapper.dataset.layout = layout;
        if (isFixedImageLayout(layout)) {
          img.style.aspectRatio = '4 / 3';
          img.style.objectFit = 'cover';
        } else {
          img.style.removeProperty('aspect-ratio');
          img.style.removeProperty('object-fit');
        }
      }

      function setCaption(caption: string) {
        captionInput.value = caption;
        wrapper.dataset.hasCaption = caption.trim() ? 'true' : 'false';
      }

      function getContainerWidth() {
        return wrapper.parentElement?.getBoundingClientRect().width || editor.view.dom.getBoundingClientRect().width || 1;
      }

      applyImageAttributes(HTMLAttributes);
      setDisplayWidth(currentWidth);
      setAlign(currentAlign);
      setLayout(currentLayout);
      setCaption(typeof node.attrs.caption === 'string' ? node.attrs.caption : '');

      captionInput.addEventListener('change', () => {
        setCaption(captionInput.value);
        commitAttrs({ caption: captionInput.value.trim() || null });
      });
      captionInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          captionInput.blur();
        }
      });

      wrapper.append(toolbar, panel, img, handle, label, captionInput);

      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const containerWidth = getContainerWidth();
        const startX = event.clientX;
        const startWidth = wrapper.getBoundingClientRect().width || containerWidth * 0.5;
        let nextWidth = currentWidth;

        const onMove = (moveEvent: PointerEvent) => {
          const nextPercent = Math.min(
            MAX_IMAGE_WIDTH_PERCENT,
            Math.max(MIN_IMAGE_WIDTH_PERCENT, ((startWidth + moveEvent.clientX - startX) / containerWidth) * 100),
          );
          nextWidth = `${Number(nextPercent.toFixed(1))}%`;
          setDisplayWidth(nextWidth);
        };

        const onUp = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          commitAttrs({ width: nextWidth, height: null });
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp, { once: true });
      });

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type !== currentNode.type) return false;
          currentNode = updatedNode;
          applyImageAttributes(updatedNode.attrs);
          setDisplayWidth(normalizeImageWidth(updatedNode.attrs.width) ?? DEFAULT_IMAGE_WIDTH);
          setAlign(normalizeImageAlign(updatedNode.attrs.align));
          setLayout(typeof updatedNode.attrs.layout === 'string' ? updatedNode.attrs.layout : 'natural');
          setCaption(typeof updatedNode.attrs.caption === 'string' ? updatedNode.attrs.caption : '');
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
          return Boolean(
            target?.closest(
              '.rte-resizable-image__handle, .rte-resizable-image__toolbar, .rte-resizable-image__panel, .rte-resizable-image__caption-input',
            ),
          );
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
