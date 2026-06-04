import { ImageGallery } from '@/components/ui/ImageGallery';
import { normalizeSpeciesGalleryCategory, type SpeciesGalleryItem } from '@/lib/species-gallery';

function makeLabels(items: SpeciesGalleryItem[]) {
  return items.map((item) => {
    const label = normalizeSpeciesGalleryCategory(item.category)?.trim();
    const note = item.note?.trim();
    if (!label && !note) return undefined;
    return {
      label,
      note,
    };
  });
}

export function SpeciesGalleryWall({
  items,
}: {
  speciesName: string;
  items: SpeciesGalleryItem[];
}) {
  const images = items.map((item) => item.url);
  const labels = makeLabels(items);

  if (images.length === 0) {
    return (
      <div className="mt-4 grid min-h-[180px] place-items-center rounded-2xl bg-leaf-50 text-sm text-ink-500">
        等待补充图集图片
      </div>
    );
  }

  return (
    <ImageGallery
      images={images}
      equalCells
      labels={labels}
      className="mt-4"
    />
  );
}
