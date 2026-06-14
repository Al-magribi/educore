-- CreateEnum
CREATE TYPE "GalleryAlbumStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "gallery_albums" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_id" TEXT,
    "status" "GalleryAlbumStatus" NOT NULL DEFAULT 'draft',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" TEXT NOT NULL,
    "album_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "image_alt" TEXT,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gallery_albums_slug_key" ON "gallery_albums"("slug");

-- CreateIndex
CREATE INDEX "gallery_albums_status_sort_order_idx" ON "gallery_albums"("status", "sort_order");

-- CreateIndex
CREATE INDEX "gallery_images_album_id_sort_order_idx" ON "gallery_images"("album_id", "sort_order");

-- AddForeignKey
ALTER TABLE "gallery_albums" ADD CONSTRAINT "gallery_albums_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "gallery_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_images" ADD CONSTRAINT "gallery_images_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "gallery_albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;
