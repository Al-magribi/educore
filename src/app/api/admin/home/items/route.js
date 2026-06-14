import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { ITEMS_SECTIONS } from "@/modules/cms/home/index.js";
import { createHomeSectionItem } from "@/modules/cms/home/service.js";

export async function POST(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { sectionType } = body;

    if (!ITEMS_SECTIONS.has(sectionType)) {
      return NextResponse.json({ error: "Tipe section tidak valid" }, { status: 400 });
    }

    const item = await createHomeSectionItem(sectionType, body);
    return NextResponse.json({ item, message: "Item berhasil ditambahkan" });
  } catch (error) {
    console.error("[admin/home/items POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menambahkan item" },
      { status: 500 }
    );
  }
}
