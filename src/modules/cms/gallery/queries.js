import "server-only";
import { prisma } from "@/lib/db.js";
import {
  mapGalleryAlbumForPublicDetail,
  mapGalleryAlbumForPublicList,
} from "./mapper.js";

const albumIncludeDetail = {
  images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
  coverImage: true,
};

export async function getPublishedGalleryAlbums() {
  const rows = await prisma.galleryAlbum.findMany({
    where: { status: "published" },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }],
    include: {
      images: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 1,
      },
      coverImage: true,
      _count: { select: { images: true } },
    },
  });

  return rows.map(mapGalleryAlbumForPublicList);
}

export async function getPublishedGalleryAlbumBySlug(slug) {
  const row = await prisma.galleryAlbum.findFirst({
    where: { slug, status: "published" },
    include: albumIncludeDetail,
  });
  if (!row) return null;
  return mapGalleryAlbumForPublicDetail(row);
}
