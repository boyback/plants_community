'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from "@/lib/client-api";
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { SPECIES_GALLERY_CATEGORIES } from "@/lib/species-gallery";
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';
import styles from './SpeciesContributionButton.module.scss';
import { cx } from '@/lib/style-utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';



const contributionTypes = [
{ value: 'correction', label: '资料纠错' },
{ value: 'gallery_image', label: '图集图片' },
{ value: 'care_tip', label: '养护经验' }] as
const;

type ContributionType = typeof contributionTypes[number]['value'];

export function SpeciesContributionButton({
  speciesId,
  speciesName



}: {speciesId: string;speciesName: string;}) {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ContributionType>('correction');
  const [busy, setBusy] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [suggestedValue, setSuggestedValue] = useState('');
  const [reason, setReason] = useState('');
  const [season, setSeason] = useState('');
  const [careContent, setCareContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageNote, setImageNote] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('');
  const galleryCategoryListId = useId();
  useBodyScrollLock(open);

  const start = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setOpen(true);
  };

  const reset = () => {
    setFieldName('');
    setSuggestedValue('');
    setReason('');
    setSeason('');
    setCareContent('');
    setImages([]);
    setImageNote('');
    setGalleryCategory('');
  };

  const buildPayload = () => {
    if (type === 'correction') {
      if (!fieldName.trim() || !suggestedValue.trim()) return null;
      return {
        fieldName: fieldName.trim(),
        suggestedValue: suggestedValue.trim(),
        reason: reason.trim(),
        content: `【${fieldName.trim()}】建议改为：${suggestedValue.trim()}${reason.trim() ? `\n原因：${reason.trim()}` : ''}`
      };
    }
    if (type === 'care_tip') {
      if (!careContent.trim()) return null;
      return {
        season: season.trim(),
        content: `${season.trim() ? `【${season.trim()}】` : ''}${careContent.trim()}`
      };
    }
    if (images.length === 0) return null;
    return {
      images,
      stage: galleryCategory,
      note: imageNote.trim(),
      content: `${galleryCategory.trim() || '图集图片'} ${images.length} 张图片${imageNote.trim() ? `：${imageNote.trim()}` : ''}`
    };
  };

  const submit = async () => {
    const payload = buildPayload();
    if (!payload) {
      toast.error(type === 'gallery_image' ? '请先上传图片' : '请填写必要内容');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/species/${speciesId}/contributions`, { type, payload });
      toast.success('已提交，等待管理员审核');
      reset();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={start}
        className={cx(styles.r_0ab86672, styles.r_426b8b75, styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_359090c2, styles.r_e83a7042, styles.r_eb6abb1f, styles.r_5756b7b4)}>

        补充图集/资料
      </button>

      {open &&
      <div className={cx(styles.r_7bc55599, styles.r_7b7df044, styles.r_181b2866, styles.r_60fbb771, styles.r_3960ffc2, styles.r_86843cf1, styles.r_094a9df0, styles.r_f0faeb26)}>
          <div className={cx(styles.r_9e46b871, styles.r_6da6a3c3, styles.r_9ef2b581, styles.r_92bf82f4, styles.r_68f2db62, styles.r_5e10cdb8, styles.r_c07e54fd, styles.r_14e46609)}>
            <div className={cx(styles.r_60fbb771, styles.r_60541e1e, styles.r_8ef2268e, styles.r_0c3bc985)}>
              <div>
                <h2 className={cx(styles.r_42536e69, styles.r_69450ef1, styles.r_4ddaa618)}>贡献 {speciesName} 图鉴资料</h2>
                <p className={cx(styles.r_b6b02c0e, styles.r_359090c2, styles.r_7b89cd85)}>图集图片会按分类和说明进入审核，通过后写入图鉴。</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className={cx(styles.r_5f22e64f, styles.r_d5eab218, styles.r_660d2eff, styles.r_fc7473ca, styles.r_7b89cd85, styles.r_5399e21f)}>
                关闭
              </button>
            </div>

            <div className={cx(styles.r_0ab86672, styles.r_3e7ce58d, styles.r_359090c2)}>
              <label className={styles.r_0214b4b3}>
                <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_2689f395, styles.r_eb6abb1f)}>贡献类型</span>
                <select
                value={type}
                onChange={(e) => setType(e.target.value as ContributionType)}
                className={cx(styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_df37b1fd, styles.r_df4824ca)}>

                  {contributionTypes.map((item) =>
                <option key={item.value} value={item.value}>{item.label}</option>
                )}
                </select>
              </label>

              {type === 'correction' &&
            <div className={styles.r_6ed543e2}>
                  <Field label="需要修正的字段">
                    <Input value={fieldName} onChange={(e) => setFieldName(e.target.value)} className={styles.r_6da6a3c3} placeholder="例如：原产地 / 花期 / 适宜温度" />
                  </Field>
                  <Field label="建议值">
                    <Input value={suggestedValue} onChange={(e) => setSuggestedValue(e.target.value)} className={styles.r_6da6a3c3} placeholder="填写建议改成什么" />
                  </Field>
                  <Field label="原因或来源">
                    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className={cx(styles.r_7d43faea, styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_df37b1fd, styles.r_df4824ca)} maxLength={1000} />
                  </Field>
                </div>
            }

              {type === 'care_tip' &&
            <div className={styles.r_6ed543e2}>
                  <Field label="季节/场景">
                    <Input value={season} onChange={(e) => setSeason(e.target.value)} className={styles.r_6da6a3c3} placeholder="例如：夏季 / 冬季 / 服盆期" />
                  </Field>
                  <Field label="养护经验">
                    <Textarea value={careContent} onChange={(e) => setCareContent(e.target.value)} className={cx(styles.r_690747ec, styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_df37b1fd, styles.r_df4824ca)} maxLength={2000} />
                  </Field>
                </div>
            }

              {type === 'gallery_image' &&
            <div className={styles.r_6ed543e2}>
                  <Field label="图集分类">
                    <Input
                  list={galleryCategoryListId}
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  className={cx(styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_df37b1fd, styles.r_df4824ca)}
                  placeholder="例如：玩家实拍 / 叶插状态 / 开花状态" />

                    <datalist id={galleryCategoryListId}>
                      {SPECIES_GALLERY_CATEGORIES.map((category) => <option key={category} value={category} />)}
                    </datalist>
                  </Field>
                  <Field label="图集图片">
                    <MultiImageUploadGrid
                  value={images}
                  onChange={setImages}
                  max={9}
                  showAddWhileUploading
                  showCount
                  gridClassName={cx(styles.r_be2e831b, styles.r_77a2a20e, styles.r_898c0bcb)}
                  tileClassName={cx(styles.r_1b398c3a, styles.r_6da6a3c3)}
                  squareTiles
                  squareAddButton />

                  </Field>
                  <Field label="图片说明">
                    <Textarea value={imageNote} onChange={(e) => setImageNote(e.target.value)} className={cx(styles.r_dd9ce2a7, styles.r_6da6a3c3, styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_88b684d2, styles.r_0e17f2bd, styles.r_03b4dd7f, styles.r_df37b1fd, styles.r_df4824ca)} maxLength={1000} placeholder="例如：实拍时间、形态状态、成长阶段、养护环境" />
                  </Field>
                </div>
            }
            </div>

            <div className={cx(styles.r_fb77735e, styles.r_60fbb771, styles.r_77c08e01, styles.r_77a2a20e)}>
              <button type="button" onClick={() => setOpen(false)} className={cx(styles.r_a217b4ea, styles.r_ca6bcd4b, styles.r_7ae4c063, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_5399e21f)}>
                取消
              </button>
              <button
              type="button"
              disabled={busy}
              onClick={submit}
              className={cx(styles.r_a217b4ea, styles.r_6bceb016, styles.r_f0faeb26, styles.r_03b4dd7f, styles.r_359090c2, styles.r_e83a7042, styles.r_72a4c7cd, styles.r_e269e58c, styles.r_d463b664)}>

                {busy ? '提交中...' : '提交审核'}
              </button>
            </div>
          </div>
        </div>
      }
    </>);

}

function Field({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className={styles.r_0214b4b3}>
      <span className={cx(styles.r_65281709, styles.r_0214b4b3, styles.r_2689f395, styles.r_eb6abb1f)}>{label}</span>
      {children}
    </div>);

}
