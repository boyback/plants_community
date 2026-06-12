import { ImageGallery } from '@/components/ui/ImageGallery';
import { normalizeSpeciesGalleryCategory, type SpeciesGalleryItem } from "@/lib/species-gallery";
import styles from './SpeciesGalleryWall.module.scss';
import { cx } from '@/lib/style-utils';



function makeLabels(items: SpeciesGalleryItem[]) {
  return items.map((item) => {
    const label = normalizeSpeciesGalleryCategory(item.category)?.trim();
    const note = item.note?.trim();
    if (!label && !note) return undefined;
    return {
      label,
      note
    };
  });
}

export function SpeciesGalleryWall({
  items



}: {speciesName: string;items: SpeciesGalleryItem[];}) {
  const images = items.map((item) => item.url);
  const labels = makeLabels(items);

  if (images.length === 0) {
    return (
      <div className={cx(styles.r_0ab86672, styles.r_f3c543ad, styles.r_d013f83e, styles.r_67d66567, styles.r_c10ff8c0, styles.r_7ebecbb6, styles.r_fc7473ca, styles.r_7b89cd85)}>
        等待补充图集图片
      </div>);

  }

  return (
    <ImageGallery
      images={images}
      equalCells
      labels={labels}
      className={styles.r_0ab86672}
      imageClassName={styles.r_c10ff8c0} />);


}