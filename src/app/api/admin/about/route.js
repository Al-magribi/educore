import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { getAboutPageForAdmin, updateAboutPage } from "@/modules/cms/about/index.js";

const SCOPE_MESSAGES = {
  page: "Halaman tentang berhasil disimpan",
  profile: "Profil sekolah berhasil disimpan",
  "vision-mission": "Visi dan misi berhasil disimpan",
  values: "Nilai-nilai utama berhasil disimpan",
};

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const about = await getAboutPageForAdmin();
    return NextResponse.json({ about });
  } catch (error) {
    console.error("[about GET]", error);
    return NextResponse.json({ error: "Gagal memuat halaman tentang" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const scope = body.scope;

    if (!scope || !SCOPE_MESSAGES[scope]) {
      return NextResponse.json({ error: "Scope tidak valid" }, { status: 400 });
    }

    const about = await updateAboutPage(scope, body);
    return NextResponse.json({
      about,
      message: SCOPE_MESSAGES[scope],
    });
  } catch (error) {
    console.error("[about PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan halaman tentang" },
      { status: 400 }
    );
  }
}
