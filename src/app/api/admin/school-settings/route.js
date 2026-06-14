import { NextResponse } from "next/server";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import {
  getSchoolSettingsForAdmin,
  updateSchoolBranding,
  updateSchoolIdentity,
  updateSchoolSeo,
  updateSchoolSettings,
} from "@/modules/cms/school-settings.js";

export async function GET() {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const school = await getSchoolSettingsForAdmin();
    return NextResponse.json({ school });
  } catch (error) {
    console.error("[school-settings GET]", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan sekolah" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const scope = body.scope || "all";

    let school;
    let message = "Pengaturan berhasil disimpan";

    switch (scope) {
      case "identity":
        school = await updateSchoolIdentity(body);
        message = "Identitas sekolah berhasil disimpan";
        break;
      case "branding":
        school = await updateSchoolBranding(body);
        message = "Logo dan favicon berhasil disimpan";
        break;
      case "seo":
        school = await updateSchoolSeo(body);
        message = "Metadata SEO berhasil disimpan";
        break;
      default:
        school = await updateSchoolSettings(body);
        message = "Pengaturan sekolah berhasil disimpan";
    }

    return NextResponse.json({ school, message });
  } catch (error) {
    console.error("[school-settings PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan pengaturan sekolah" },
      { status: 500 }
    );
  }
}
