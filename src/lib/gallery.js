import "server-only";
import {
  getPublishedGalleryAlbumBySlug,
  getPublishedGalleryAlbums,
} from "@/modules/cms/gallery/queries.js";

export { GALLERY_PAGE_META } from "@/lib/gallery-utils.js";

export async function getAllGalleryAlbums() {
  return getPublishedGalleryAlbums();
}

export async function getGalleryAlbumBySlug(slug) {
  return getPublishedGalleryAlbumBySlug(slug);
}
