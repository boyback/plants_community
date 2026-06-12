import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';
import type { EditorT, PostDraft } from './types';
import styles from './DraftSidebar.module.scss';
import { cx } from '@/lib/style-utils';



interface Props {
  drafts: PostDraft[];
  draftId: string | null;
  t: EditorT;
  onLoadDraft: (draft: PostDraft) => void;
  onDeleteDraft?: (draft: PostDraft) => Promise<void> | void;
}

export function DraftSidebar({
  drafts,
  draftId,
  t,
  onLoadDraft,
  onDeleteDraft
}: Props) {
  return (
    <>
      <div className={styles.r_8e63407b}>
        <div className={cx(styles.r_1bb88326, styles.r_60fbb771, styles.r_3960ffc2, styles.r_8ef2268e)}>
          <div className={cx(styles.r_fc7473ca, styles.r_e83a7042, styles.r_399e11a5)}>
            草稿箱
          </div>
          <span className={cx(styles.r_d058ca6d, styles.r_69335b95)}>{drafts.length}</span>
        </div>
        {drafts.length === 0 ?
        <p className={cx(styles.r_cb11fec3, styles.r_ca6bf630, styles.r_359090c2, styles.r_6c4cc49e)}>{t('common.empty')}</p> :

        <ul className={styles.r_6f7e013d}>
            {drafts.map((draft) =>
          <li
            key={draft.id}
            className={cn(cx(styles.r_64292b1c, styles.r_d89972fe, styles.r_5f22e64f, styles.r_ca6bcd4b, styles.r_9fe52d5d, styles.r_ceb69a6b),

            draftId === draft.id ? cx(styles.r_e0e39c88, styles.r_7ebecbb6) : cx(styles.r_88b684d2, styles.r_5aae3db6)


            )}>

                <button
              type='button'
              onClick={() => onLoadDraft(draft)}
              className={cx(styles.r_0214b4b3, styles.r_6da6a3c3, styles.r_2eba0d65)}>

                  <div className={cx(styles.r_f283ea9b, styles.r_fc7473ca, styles.r_2689f395, styles.r_399e11a5)}>
                    {draft.title || t('common.empty')}
                  </div>
                  <div className={cx(styles.r_15e1b1f4, styles.r_1dc571a3, styles.r_69335b95)}>
                    {t(`post.types.${draft.type}`)} · {new Date(draft.savedAt).toLocaleString()}
                  </div>
                </button>
                <button
              type='button'
              onClick={() => void onDeleteDraft?.(draft)}
              className={cx(styles.r_da4dbfbc, styles.r_62925abe, styles.r_b1044d86, styles.r_b17d6a13, styles.r_7065497e, styles.r_67d6184a, styles.r_46353e18, styles.r_181f3d6c)}
              aria-label={t('common.delete')}>

                  <Icon name='trash' size={14} />
                </button>
              </li>
          )}
          </ul>
        }
      </div>
    </>);

}