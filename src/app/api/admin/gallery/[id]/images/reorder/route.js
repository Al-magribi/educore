import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { reorderGalleryImages } from "@/modules/cms/gallery/index.js";

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const orderedIds = body.orderedIds;
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds wajib berupa array" }, { status: 400 });
    }
    const album = await reorderGalleryImages(id, orderedIds);
    return NextResponse.json({ album, message: "Urutan gambar disimpan" });
  } catch (error) {
    console.error("[admin/gallery/[id]/images/reorder PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan urutan" },
      { status: 400 }
    );
  }
}
