declare module "photoswipe-thumbs-plugin" {
  import PhotoSwipeLightbox from "photoswipe/lightbox";

  interface PhotoSwipeThumbsOptions {
    thumbSelector?: string;
  }

  class PhotoSwipeThumbs {
    constructor(lightbox: PhotoSwipeLightbox, options?: PhotoSwipeThumbsOptions);
  }

  export default PhotoSwipeThumbs;
}