import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { ITEMS_SECTIONS } from "@/modules/cms/home/index.js";
import { reorderHomeSectionItems } from "@/modules/cms/home/service.js";

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { sectionType, orderedIds } = body;

    if (!ITEMS_SECTIONS.has(sectionType) || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const section = await reorderHomeSectionItems(sectionType, orderedIds);
    return NextResponse.json({ section, message: "Urutan diperbarui" });
  } catch (error) {
    console.error("[admin/home/items/reorder PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengurutkan item" },
      { status: 500 }
    );
  }
}
