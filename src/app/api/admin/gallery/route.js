import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { createGalleryAlbum, listAdminGalleryAlbums } from "@/modules/cms/gallery/index.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const albums = await listAdminGalleryAlbums();
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("[admin/gallery GET]", error);
    return NextResponse.json({ error: "Gagal memuat daftar album" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const album = await createGalleryAlbum(body);
    return NextResponse.json({ album, message: "Album berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[admin/gallery POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat album" },
      { status: 400 }
    );
  }
}
