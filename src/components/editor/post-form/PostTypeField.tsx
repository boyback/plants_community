import type { PostType } from '@/lib/types';
import { TypePicker } from '@/components/post/TypePicker';
import { PostTypeBadge } from '@/components/ui/PostTypeBadge';
import type { EditorT } from './types';
import styles from './PostTypeField.module.scss';
import { cx } from '@/lib/style-utils';



export function PostTypeField({
  type,
  isEdit,
  t,
  onChange





}: {type: PostType;isEdit: boolean;t: EditorT;onChange: (type: PostType) => void;}) {
  return (
    <div className={styles.r_fb88ccaa}>
      <div className={cx(styles.r_d7c1392c, styles.r_0214b4b3, styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
        <span className={styles.r_fa512798}>*</span> {t('editor.pickType')}
      </div>
      {isEdit ?
      <div className={cx(styles.r_60fbb771, styles.r_3960ffc2, styles.r_77a2a20e)}>
          <PostTypeBadge type={type} />
          <span className={cx(styles.r_359090c2, styles.r_69335b95)}>编辑时不能修改类型</span>
        </div> :

      <TypePicker value={type} onChange={onChange} />
      }
    </div>);

}