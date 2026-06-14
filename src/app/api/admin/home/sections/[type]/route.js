import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { HOME_SECTION_TYPES } from "@/modules/cms/home/index.js";
import { updateHomeSection } from "@/modules/cms/home/service.js";

export async function PUT(request, { params }) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  const { type } = await params;
  if (!HOME_SECTION_TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipe section tidak valid" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const section = await updateHomeSection(type, {
      isPublished: body.isPublished,
      content: body.content,
    });
    return NextResponse.json({
      section,
      message: "Section berhasil disimpan",
    });
  } catch (error) {
    console.error("[admin/home/sections PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan section" },
      { status: 500 }
    );
  }
}
