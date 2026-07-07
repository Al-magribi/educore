import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  getInvoiceSettingsForAdmin,
  getInvoiceSchoolDefaults,
  upsertInvoiceSettings,
} from "@/modules/payment/invoice.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const [settings, schoolDefaults] = await Promise.all([
      getInvoiceSettingsForAdmin(),
      getInvoiceSchoolDefaults(),
    ]);
    return NextResponse.json({ settings, schoolDefaults });
  } catch (error) {
    console.error("[spmb-admin/invoice-settings GET]", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan invoice" }, { status: 500 });
  }
}

export async function PUT(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const settings = await upsertInvoiceSettings(body);
    return NextResponse.json({
      settings,
      message: "Pengaturan invoice berhasil disimpan",
    });
  } catch (error) {
    console.error("[spmb-admin/invoice-settings PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan pengaturan invoice" },
      { status: 400 }
    );
  }
}
