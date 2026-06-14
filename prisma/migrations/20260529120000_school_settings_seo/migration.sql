-- AlterTable
ALTER TABLE "school_settings" ADD COLUMN "site_url" TEXT;
ALTER TABLE "school_settings" ADD COLUMN "meta_description" TEXT;
ALTER TABLE "school_settings" ADD COLUMN "meta_keywords" TEXT;
ALTER TABLE "school_settings" ADD COLUMN "robots_index" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "school_settings" ADD COLUMN "robots_follow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "school_settings" ADD COLUMN "og_image_url" TEXT;
