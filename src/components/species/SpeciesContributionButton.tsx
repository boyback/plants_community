'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/Toast';
import { MultiImageUploadGrid } from '@/components/upload/MultiImageUploadGrid';
import { SPECIES_GALLERY_CATEGORIES } from '@/lib/species-gallery';

const contributionTypes = [
  { value: 'correction', label: '资料纠错' },
  { value: 'gallery_image', label: '图集图片' },
  { value: 'care_tip', label: '养护经验' },
] as const;

type ContributionType = typeof contributionTypes[number]['value'];

export function SpeciesContributionButton({
  speciesId,
  speciesName,
}: {
  speciesId: string;
  speciesName: string;
}) {
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
        content: `【${fieldName.trim()}】建议改为：${suggestedValue.trim()}${reason.trim() ? `\n原因：${reason.trim()}` : ''}`,
      };
    }
    if (type === 'care_tip') {
      if (!careContent.trim()) return null;
      return {
        season: season.trim(),
        content: `${season.trim() ? `【${season.trim()}】` : ''}${careContent.trim()}`,
      };
    }
    if (images.length === 0) return null;
    return {
      images,
      stage: galleryCategory,
      note: imageNote.trim(),
      content: `${galleryCategory.trim() || '图集图片'} ${images.length} 张图片${imageNote.trim() ? `：${imageNote.trim()}` : ''}`,
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
        className="mt-4 h-10 w-full rounded-xl border border-leaf-100 text-xs font-semibold text-ink-700 hover:bg-leaf-50"
      >
        补充图集/资料
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
          <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink-900">贡献 {speciesName} 图鉴资料</h2>
                <p className="mt-1 text-xs text-ink-500">图集图片会按分类和说明进入审核，通过后写入图鉴。</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-sm text-ink-500 hover:bg-ink-50">
                关闭
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <label className="block">
                <span className="mb-1 block font-medium text-ink-700">贡献类型</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ContributionType)}
                  className="w-full rounded-xl border border-leaf-100 px-3 py-2 outline-none focus:border-leaf-300"
                >
                  {contributionTypes.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>

              {type === 'correction' && (
                <div className="space-y-3">
                  <Field label="需要修正的字段">
                    <input value={fieldName} onChange={(e) => setFieldName(e.target.value)} className="input w-full" placeholder="例如：原产地 / 花期 / 适宜温度" />
                  </Field>
                  <Field label="建议值">
                    <input value={suggestedValue} onChange={(e) => setSuggestedValue(e.target.value)} className="input w-full" placeholder="填写建议改成什么" />
                  </Field>
                  <Field label="原因或来源">
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[90px] w-full rounded-xl border border-leaf-100 px-3 py-2 outline-none focus:border-leaf-300" maxLength={1000} />
                  </Field>
                </div>
              )}

              {type === 'care_tip' && (
                <div className="space-y-3">
                  <Field label="季节/场景">
                    <input value={season} onChange={(e) => setSeason(e.target.value)} className="input w-full" placeholder="例如：夏季 / 冬季 / 服盆期" />
                  </Field>
                  <Field label="养护经验">
                    <textarea value={careContent} onChange={(e) => setCareContent(e.target.value)} className="min-h-[130px] w-full rounded-xl border border-leaf-100 px-3 py-2 outline-none focus:border-leaf-300" maxLength={2000} />
                  </Field>
                </div>
              )}

              {type === 'gallery_image' && (
                <div className="space-y-3">
                  <Field label="图集分类">
                    <input
                      list={galleryCategoryListId}
                      value={galleryCategory}
                      onChange={(e) => setGalleryCategory(e.target.value)}
                      className="w-full rounded-xl border border-leaf-100 px-3 py-2 outline-none focus:border-leaf-300"
                      placeholder="例如：玩家实拍 / 叶插状态 / 开花状态"
                    />
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
                      gridClassName="grid-cols-3 gap-2 sm:grid-cols-4"
                      tileClassName="h-[92px] w-full"
                      squareTiles
                      squareAddButton
                    />
                  </Field>
                  <Field label="图片说明">
                    <textarea value={imageNote} onChange={(e) => setImageNote(e.target.value)} className="min-h-[80px] w-full rounded-xl border border-leaf-100 px-3 py-2 outline-none focus:border-leaf-300" maxLength={1000} placeholder="例如：实拍时间、形态状态、成长阶段、养护环境" />
                  </Field>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-ink-200 px-4 py-2 text-xs hover:bg-ink-50">
                取消
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="rounded-xl bg-leaf-600 px-4 py-2 text-xs font-semibold text-white hover:bg-leaf-700 disabled:opacity-60"
              >
                {busy ? '提交中...' : '提交审核'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block font-medium text-ink-700">{label}</span>
      {children}
    </div>
  );
}
