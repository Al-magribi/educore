import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  deleteHomeSectionItem,
  updateHomeSectionItem,
} from "@/modules/cms/home/service.js";

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const item = await updateHomeSectionItem(id, body);
    return NextResponse.json({ item, message: "Item berhasil disimpan" });
  } catch (error) {
    console.error("[admin/home/items PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan item" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteHomeSectionItem(id);
    return NextResponse.json({ message: "Item dihapus" });
  } catch (error) {
    console.error("[admin/home/items DELETE]", error);
    return NextResponse.json({ error: "Gagal menghapus item" }, { status: 500 });
  }
}
