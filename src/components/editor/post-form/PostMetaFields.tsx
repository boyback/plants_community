import { UploadField } from '@/components/upload/UploadField';
import { TagSelector } from '@/components/editor/TagSelector';
import { BoardSelect } from '@/components/editor/BoardSelect';
import { FieldRow } from './FieldRow';
import type { EditorT } from './types';
import styles from './PostMetaFields.module.scss';
import { cx } from '@/lib/style-utils';



interface BoardSelection {
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
}

interface Props {
  t: EditorT;
  categorySlug: string;
  genusSlug: string;
  speciesSlug: string;
  onBoardChange: (selection: BoardSelection) => void;
  boardInvalid: boolean;
  autoSelectFirst: boolean;
  showBoard?: boolean;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  cover: string;
  onCoverChange: (cover: string) => void;
}

export function PostMetaFields({
  t,
  categorySlug,
  genusSlug,
  speciesSlug,
  onBoardChange,
  boardInvalid,
  autoSelectFirst,
  showBoard = true,
  tags,
  onTagsChange,
  cover,
  onCoverChange
}: Props) {
  return (
    <div className={styles.r_b43b4c08}>
      {showBoard &&
      <div>
          <div className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
            <span className={styles.r_fa512798}>*</span> {t('editor.chooseBoard')}
          </div>
          <BoardSelect
          value={{ categorySlug, genusSlug, speciesSlug }}
          onChange={onBoardChange}
          invalid={boardInvalid}
          autoSelectFirst={autoSelectFirst} />

        </div>
      }

      <FieldRow label={t('editor.tags')}>
        <TagSelector value={tags} onChange={onTagsChange} />
      </FieldRow>

      <FieldRow label={t('editor.cover')}>
        <div className={cx(styles.r_60fbb771, styles.r_8dddea07, styles.r_1004c0c3, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_60e1dfd7, styles.r_eb6e8b88, styles.r_020ba687, styles.r_9f76a62f)}>
          <UploadField
            kind='image'
            value={cover ? [cover] : []}
            onChange={(arr) => onCoverChange(arr[0] ?? '')}
            max={1}
            simpleMode
            className={cx(styles.r_6da6a3c3, styles.r_934e8d33)}
            itemClassName={cx(styles.r_271c257f, styles.r_5f22e64f, styles.r_5e10cdb8)}
            itemImageClassName={styles.r_b1104f41} />

          <div className={cx(styles.r_359090c2, styles.r_7054e276, styles.r_69335b95)}>
            <div className={cx(styles.r_2689f395, styles.r_eb6abb1f)}>单张封面图</div>
            <div>不限比例，列表缩略图可能裁切，建议主体居中。</div>
          </div>
        </div>
      </FieldRow>
    </div>);

}
