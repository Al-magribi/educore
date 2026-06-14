import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { getAdminHomeSections } from "@/modules/cms/home/index.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const sections = await getAdminHomeSections();
    return NextResponse.json({ sections });
  } catch (error) {
    console.error("[admin/home GET]", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan beranda" }, { status: 500 });
  }
}
