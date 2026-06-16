"use client";

import { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Input";
import { MultiImageUploadGrid, type MultiImageUploadGridHandle } from "@/components/upload/MultiImageUploadGrid";
import { useI18n } from "@/i18n/I18nContext";
import { toast } from "@/components/ui/Toast";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import styles from './Toolbar.module.scss';
import { cx } from '@/lib/style-utils';



const TEXT_COLOR_OPTIONS = [
{ name: "默认", value: null, swatch: "#1f2937" },
{ name: "绿色", value: "#2f7d52", swatch: "#2f7d52" },
{ name: "红色", value: "#dc2626", swatch: "#dc2626" },
{ name: "橙色", value: "#ea580c", swatch: "#ea580c" },
{ name: "蓝色", value: "#2563eb", swatch: "#2563eb" },
{ name: "紫色", value: "#7c3aed", swatch: "#7c3aed" },
{ name: "灰色", value: "#64748b", swatch: "#64748b" }] as
const;

/**
 * 工具栏:统一在编辑器上方,样式与社区其它按钮一致。
 *
 * 工具组:
 *   - 文本:加粗、斜体、下划线、删除线
 *   - 标题:H1 / H2 / H3
 *   - 列表:无序、有序
 *   - 块:引用、分隔线
 *   - 插入:链接、图片
 *   - 清除格式
 */
export function Toolbar({ editor }: {editor: Editor | null;}) {
  const { t } = useI18n();
  const [imageOpen, setImageOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  if (!editor) {
    return (
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_65fdbade, styles.r_88b684d2, styles.r_54720a96, styles.r_d5eab218, styles.r_ec0091ee, styles.r_359090c2, styles.r_6c4cc49e)}>
        {t("editor.toolbar.loading")}
      </div>);

  }

  return (
    <div className={cx(styles.r_60fbb771, styles.r_1eb5c6df, styles.r_3960ffc2, styles.r_a3899220, styles.r_65fdbade, styles.r_88b684d2, styles.r_54720a96, styles.r_45d82811, styles.r_ec0091ee)}>
      <Group>
        <ToolBtn
          title={t("editor.toolbar.bold")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}>

          <span className={styles.r_69450ef1}>B</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.italic")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}>

          <span className={styles.r_90665ca6}>I</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.underline")}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>

          <span className={styles.r_c82b67c8}>U</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.strike")}
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}>

          <span className={styles.r_093ca562}>S</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.code")}
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}>

          <span className={cx(styles.r_0e65706b, styles.r_d058ca6d)}>{"<>"}</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.h1")}
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
          }>

          <span className={cx(styles.r_d058ca6d, styles.r_69450ef1)}>H1</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.h2")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
          }>

          <span className={cx(styles.r_d058ca6d, styles.r_69450ef1)}>H2</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.h3")}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
          }>

          <span className={cx(styles.r_d058ca6d, styles.r_69450ef1)}>H3</span>
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.bulletList")}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>

          •
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.orderedList")}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>

          1.
        </ToolBtn>
        <MarkerColorPicker editor={editor} />
        <ToolBtn
          title={t("editor.toolbar.blockquote")}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>

          <span className={styles.r_69cdf25a}>❝</span>
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.hr")}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>

          ─
        </ToolBtn>
      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title='左对齐'
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}>

          <AlignIcon align='left' />
        </ToolBtn>
        <ToolBtn
          title='居中'
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}>

          <AlignIcon align='center' />
        </ToolBtn>
        <ToolBtn
          title='右对齐'
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}>

          <AlignIcon align='right' />
        </ToolBtn>
        <ToolBtn
          title='高亮'
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}>

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
          onClick={() => setLinkOpen(true)} />

        <InsertToolBtn
          title={t("editor.toolbar.image")}
          label='图片'
          icon='image'
          onClick={() => setImageOpen(true)} />

      </Group>

      <Divider />

      <Group>
        <ToolBtn
          title={t("editor.toolbar.undo")}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}>

          <Icon name="arrow-right" size={13} className={styles.r_895f127d} />
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.redo")}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}>

          <Icon name="arrow-right" size={13} />
        </ToolBtn>
        <ToolBtn
          title={t("editor.toolbar.clear")}
          onClick={() =>
          editor.chain().focus().clearNodes().unsetAllMarks().run()
          }>

          ✕
        </ToolBtn>
      </Group>

      {imageOpen &&
      createPortal(
        <ImageDialog
          onCancel={() => setImageOpen(false)}
          onInsert={(urls) => {
            editor.
            chain().
            focus().
            insertContent([
            ...urls.map((url) => ({
              type: "image",
              attrs: { src: url }
            })),
            {
              type: "paragraph"
            }]
            ).
            run();
            setImageOpen(false);
          }} />,
        document.body
      )

      }

      {linkOpen &&
      createPortal(
        <LinkDialog
          initial={editor.getAttributes("link")?.href ?? ""}
          onCancel={() => setLinkOpen(false)}
          onInsert={(url) => {
            if (!url) {
              editor.chain().focus().unsetLink().run();
            } else {
              editor.
              chain().
              focus().
              extendMarkRange("link").
              setLink({ href: url }).
              run();
            }
            setLinkOpen(false);
          }} />,
        document.body
      )

      }
    </div>);

}

function Group({ children }: {children: React.ReactNode;}) {
  return <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_a3899220)}>{children}</div>;
}

function Divider() {
  return <span className={cx(styles.r_69ded2cf, styles.r_cd0d9c51, styles.r_47a69140, styles.r_f2b23104)} />;
}

function ToolBtn({
  title,
  active,
  disabled,
  onClick,
  children






}: {title: string;active?: boolean;disabled?: boolean;onClick?: () => void;children: React.ReactNode;}) {
  return (
    <button
      type='button'
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_9bda00a3, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_45d82811, styles.r_fc7473ca, styles.r_ceb69a6b),

      active ? cx(styles.r_f2b23104, styles.r_e7eab4cb) : cx(styles.r_eb6abb1f, styles.r_5756b7b4),
      disabled && cx(styles.r_29b733e4, styles.r_2a2db466, styles.r_de520d1a)
      )}>

      {children}
    </button>);

}

function InsertToolBtn({
  title,
  label,
  icon,
  active,
  onClick






}: {title: string;label: string;icon: "link" | "image";active?: boolean;onClick: () => void;}) {
  return (
    <button
      type='button'
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(cx(styles.r_52083e7d, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_44ee8ba0, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_d5eab218, styles.r_69cdf25a, styles.r_2689f395, styles.r_ceb69a6b),

      active ? cx(styles.r_e0e39c88, styles.r_f2b23104, styles.r_e7eab4cb) : cx(styles.r_88b684d2, styles.r_b0b66d88, styles.r_eb6abb1f, styles.r_a5c39c39, styles.r_29687528, styles.r_81be6435)


      )}>

      <Icon name={icon} size={14} strokeWidth={1.9} />
      <span>{label}</span>
    </button>);

}

function AlignIcon({ align }: {align: "left" | "center" | "right";}) {
  const lineClass =
  align === "left" ? styles.r_60541e1e :

  align === "right" ? styles.r_6f27f4f7 : styles.r_3960ffc2;



  return (
    <span className={cn(cx(styles.r_60fbb771, styles.r_dc7972eb, styles.r_8dddea07, styles.r_7a938543), lineClass)}>
      <span className={cx(styles.r_aea61608, styles.r_dc7972eb, styles.r_07389a77, styles.r_dde870f2)} />
      <span className={cx(styles.r_aea61608, styles.r_9cea0567, styles.r_07389a77, styles.r_dde870f2)} />
      <span className={cx(styles.r_aea61608, styles.r_dc7972eb, styles.r_07389a77, styles.r_dde870f2)} />
    </span>);

}

function TextColorPicker({ editor }: {editor: Editor;}) {
  const currentColor = (
  editor.getAttributes("textStyle")?.color as string | undefined)?.
  toLowerCase();
  const customColorValue = /^#[0-9a-f]{6}$/i.test(currentColor ?? "") ?
  currentColor! :
  "#2f7d52";
  const isPresetColor = TEXT_COLOR_OPTIONS.some(
    (color) => color.value?.toLowerCase() === currentColor
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
    <div className={cx(styles.r_b45ce4b6, styles.r_60fbb771, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_a3899220, styles.r_07389a77, styles.r_d2fa6cb5, styles.r_d8e0e382)}>
      <span className={cx(styles.r_1caf26c4, styles.r_d058ca6d, styles.r_e83a7042, styles.r_eb6abb1f)} title='文字颜色'>
        A
      </span>
      {TEXT_COLOR_OPTIONS.map((color) => {
        const active = color.value ?
        currentColor === color.value.toLowerCase() :
        !currentColor;

        return (
          <button
            key={color.name}
            type='button'
            title={`文字颜色：${color.name}`}
            aria-label={`文字颜色：${color.name}`}
            onClick={() => {
              applyColor(color.value);
            }}
            className={cn(cx(styles.r_60fbb771, styles.r_cd0d9c51, styles.r_72470489, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_ceb69a6b, styles.r_2ada7954),

            active ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6) : cx(styles.r_88b684d2, styles.r_5e10cdb8)
            )}>

            {color.value ?
            <span
              className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692)}
              style={{ backgroundColor: color.swatch }} /> :


            <span className={cx(styles.r_d89972fe, styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692, styles.r_ca6bcd4b, styles.r_1176a652, styles.r_5e10cdb8)}>
                <span className={cx(styles.r_da4dbfbc, styles.r_d5db4e01, styles.r_d694ba66, styles.r_aea61608, styles.r_0a749664, styles.r_9548dd9f, styles.r_45a732a4)} />
              </span>
            }
          </button>);

      })}
      <label
        title='自定义文字颜色'
        aria-label='自定义文字颜色'
        className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_cd0d9c51, styles.r_72470489, styles.r_34516836, styles.r_3960ffc2, styles.r_86843cf1, styles.r_2cd02d11, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_ceb69a6b, styles.r_2ada7954),

        isCustomColor ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6) : cx(styles.r_88b684d2, styles.r_5e10cdb8)
        )}>

        <input
          type='color'
          value={customColorValue}
          onChange={(event) => {
            applyColor(event.currentTarget.value);
          }}
          className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_34516836, styles.r_7065497e)} />

        <span
          className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692)}
          style={{
            background:
            "conic-gradient(#dc2626, #ea580c, #facc15, #2f7d52, #2563eb, #7c3aed, #dc2626)"
          }} />

      </label>
    </div>);

}

function MarkerColorPicker({ editor }: {editor: Editor;}) {
  const isListItem = editor.isActive("listItem");
  const currentColor = (
  editor.getAttributes("listItem")?.markerColor as string | undefined)?.
  toLowerCase();
  const customColorValue = /^#[0-9a-f]{6}$/i.test(currentColor ?? "") ?
  currentColor! :
  "#2f7d52";
  const isPresetColor = TEXT_COLOR_OPTIONS.some(
    (color) => color.value?.toLowerCase() === currentColor
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
      className={cn(cx(styles.r_b45ce4b6, styles.r_60fbb771, styles.r_d0a52b31, styles.r_3960ffc2, styles.r_a3899220, styles.r_07389a77, styles.r_d2fa6cb5, styles.r_d8e0e382),

      !isListItem && styles.r_0b8c506a
      )}
      title='列表标记颜色'>

      <span className={cx(styles.r_1caf26c4, styles.r_a14daebf, styles.r_e83a7042, styles.r_c2385a46, styles.r_eb6abb1f)}>
        •
      </span>
      {TEXT_COLOR_OPTIONS.map((color) => {
        const active = color.value ?
        currentColor === color.value.toLowerCase() :
        !currentColor;

        return (
          <button
            key={color.name}
            type='button'
            title={`列表标记颜色：${color.name}`}
            aria-label={`列表标记颜色：${color.name}`}
            onClick={() => applyMarkerColor(color.value)}
            className={cn(cx(styles.r_60fbb771, styles.r_cd0d9c51, styles.r_72470489, styles.r_3960ffc2, styles.r_86843cf1, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_ceb69a6b, styles.r_2ada7954),

            active && isListItem ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6) : cx(styles.r_88b684d2, styles.r_5e10cdb8)
            )}>

            {color.value ?
            <span
              className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692)}
              style={{ backgroundColor: color.swatch }} /> :


            <span className={cx(styles.r_d89972fe, styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692, styles.r_ca6bcd4b, styles.r_1176a652, styles.r_5e10cdb8)}>
                <span className={cx(styles.r_da4dbfbc, styles.r_d5db4e01, styles.r_d694ba66, styles.r_aea61608, styles.r_0a749664, styles.r_9548dd9f, styles.r_45a732a4)} />
              </span>
            }
          </button>);

      })}
      <label
        title='自定义列表标记颜色'
        aria-label='自定义列表标记颜色'
        className={cn(cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_cd0d9c51, styles.r_72470489, styles.r_34516836, styles.r_3960ffc2, styles.r_86843cf1, styles.r_2cd02d11, styles.r_07389a77, styles.r_ca6bcd4b, styles.r_ceb69a6b, styles.r_2ada7954),

        isCustomColor && isListItem ? cx(styles.r_3bd65fe8, styles.r_7ebecbb6) : cx(styles.r_88b684d2, styles.r_5e10cdb8)
        )}>

        <input
          type='color'
          value={customColorValue}
          onClick={(event) => {
            if (!isListItem) event.preventDefault();
          }}
          onChange={(event) => {
            applyMarkerColor(event.currentTarget.value);
          }}
          className={cx(styles.r_da4dbfbc, styles.r_7b7df044, styles.r_668b21aa, styles.r_6da6a3c3, styles.r_34516836, styles.r_7065497e)} />

        <span
          className={cx(styles.r_6a60c09e, styles.r_9cea0567, styles.r_36d44692)}
          style={{
            background:
            "conic-gradient(#dc2626, #ea580c, #facc15, #2f7d52, #2563eb, #7c3aed, #dc2626)"
          }} />

      </label>
    </div>);

}

const MAX_IMAGE_UPLOAD_COUNT = 20;

function ImageDialog({
  onInsert,
  onCancel



}: {onInsert: (urls: Array<string>) => void;onCancel: () => void;}) {
  useBodyScrollLock(true);

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
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7f74fd84, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
      onClick={handleCancel}>

      <div
        className={cx(styles.r_d89972fe, styles.r_60fbb771, styles.r_179c0e54, styles.r_23600397, styles.r_8dddea07, styles.r_8e63407b)}
        onClick={(e) => e.stopPropagation()}>

        <button
          type='button'
          onClick={handleCancel}
          className={cx(styles.r_da4dbfbc, styles.r_c84e3e18, styles.r_d7fbcc4b, styles.r_60fbb771, styles.r_426b8b75, styles.r_d854e569, styles.r_88fd9fe8, styles.r_3960ffc2, styles.r_86843cf1, styles.r_67d6184a, styles.r_eaeb7419)}>

          <Image src="/icons/close-circle.svg" alt='关闭' width={25} height={25} />
        </button>

        <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>已上传的图片</div>
        {isInitialEmpty &&
        <EmptyImageUploadPrompt onClick={() => uploadGridRef.current?.openPicker()} />
        }
        <div className={isInitialEmpty ? styles.r_99d72c7f : cx(styles.r_eccd13ef, styles.r_36e579c0)}>
          <MultiImageUploadGrid
            ref={uploadGridRef}
            value={uploadedUrls}
            onChange={setUploadedUrls}
            max={MAX_IMAGE_UPLOAD_COUNT}
            onUploadingChange={setIsUploading}
            showCount={false}
            gridClassName={cx(styles.r_931228bb, styles.r_44ee8ba0)}
            tileClassName={cx(styles.r_4b4cc48e, styles.r_d524f8b8)}
            hideAddButton={isInitialEmpty}
            showAddWhileUploading
            squareTiles
            squareAddButton
            className={cx(styles.r_60fbb771, styles.r_668b21aa, styles.r_8dddea07)}
            helpTextClassName={cx(styles.r_e42315b7, styles.r_f46b61a9)}
            helpText={
            <>
                <div>最多上传 20 张，单张不超过 10 MB，可一次选择多张</div>
                <div>仅支持 jpg / png / webp / gif / heic</div>
              </>
            } />

        </div>

        <div className={cx(styles.r_9953408a, styles.r_60fbb771, styles.r_77c08e01, styles.r_173fa8f0)}>
          <button
            type='button'
            onClick={handleInsertRich}
            disabled={uploadedUrls.length === 0}
            className={cn(
              'btn-primary',
              uploadedUrls.length === 0 && cx(styles.r_29b733e4, styles.r_0b8c506a)
            )}>

            确认
          </button>
        </div>
        {closeConfirmOpen &&
        <div
          className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7c497374, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_b0d7388d, styles.r_8e63407b)}
          onClick={() => setCloseConfirmOpen(false)}>

            <div
            className={cx(styles.r_6da6a3c3, styles.r_2472e9b8, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_a739868a)}
            onClick={(event) => event.stopPropagation()}>

              <div className={cx(styles.r_4ee73492, styles.r_e83a7042, styles.r_399e11a5)}>关闭上传弹窗？</div>
              <p className={cx(styles.r_50d0d216, styles.r_fc7473ca, styles.r_18550d59, styles.r_02eb621e)}>
                当前还有图片正在上传，关闭后会取消未完成的上传。
              </p>
              <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
                <button
                type='button'
                onClick={() => setCloseConfirmOpen(false)}
                className={cx(styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_5e10cdb8, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_eb6abb1f, styles.r_ceb69a6b, styles.r_5399e21f)}>

                  继续等待
                </button>
                <button
                type='button'
                onClick={onCancel}
                className={cx(styles.r_45a732a4, styles.r_0e17f2bd, styles.r_ec0091ee, styles.r_fc7473ca, styles.r_2689f395, styles.r_72a4c7cd, styles.r_ceb69a6b, styles.r_62129538)}>

                  关闭
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>);

}

function EmptyImageUploadPrompt({ onClick }: {onClick: () => void;}) {
  return (
    <div className={cx(styles.r_a4326536, styles.r_da4dbfbc, styles.r_7b7df044, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_8e63407b)}>
      <div className={cx(styles.r_7d5d4c29, styles.r_60fbb771, styles.r_8dddea07, styles.r_3960ffc2, styles.r_1004c0c3, styles.r_ca6bf630)}>
        <button
          type='button'
          onClick={onClick}
          className={cx(styles.r_60fbb771, styles.r_afd5c303, styles.r_c1ca66f1, styles.r_8dddea07, styles.r_3960ffc2, styles.r_86843cf1, styles.r_44ee8ba0, styles.r_ca6bcd4b, styles.r_a29b7a64, styles.r_691861bc, styles.r_54720a96, styles.r_359090c2, styles.r_ceb69a6b, styles.r_0a7c2f87, styles.r_98dc6304)}>

          <Icon name='plus' size={18} className={styles.r_b17d6a13} />
          <span className={cx(styles.r_1dc571a3, styles.r_69335b95)}>图片</span>
        </button>
        <div className={cx(styles.r_e2eedc57, styles.r_d058ca6d, styles.r_3353f144)}>
          <div>最多上传 20 张，单张不超过 10 MB，可一次选择多张</div>
          <div>仅支持 jpg / png / webp / gif / heic</div>
        </div>
      </div>
    </div>);

}
function LinkDialog({
  initial,
  onInsert,
  onCancel




}: {initial: string;onInsert: (url: string) => void;onCancel: () => void;}) {
  useBodyScrollLock(true);

  const { t } = useI18n();
  const [url, setUrl] = useState(initial);
  return (
    <div
      className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_7f74fd84, styles.r_f3c543ad, styles.r_67d66567, styles.r_094a9df0, styles.r_8e63407b)}
      onClick={onCancel}>

      <div
        className={cx(styles.r_6da6a3c3, styles.r_9794ab45, styles.r_c07e54fd)}
        onClick={(e) => e.stopPropagation()}>

        <div className={cx(styles.r_1bb88326, styles.r_4ee73492, styles.r_e83a7042)}>
          {t("editor.toolbar.linkDialog.title")}
        </div>
        <div className={cx(styles.r_359090c2, styles.r_21d33c50, styles.r_65281709)}>
          {t("editor.toolbar.linkDialog.urlLabel")}
        </div>
        <Input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className={styles.input} />

        <div className={cx(styles.r_0ab86672, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
          {initial &&
          <button
            onClick={() => onInsert("")}
            className={styles.r_dd702538}>

              {t("editor.toolbar.linkDialog.remove")}
            </button>
          }
          <button onClick={onCancel} className={styles.r_dd702538}>
            {t("common.cancel")}
          </button>
          <button
            onClick={() => onInsert(url.trim())}
            className={styles.r_dd702538}>

            {t("editor.toolbar.linkDialog.confirm")}
          </button>
        </div>
      </div>
    </div>);

}
