import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  getAdminApplicationFormData,
  saveAdminApplicationForm,
} from "@/modules/spmb/services/admin-form.js";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const data = await getAdminApplicationFormData(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb-admin/applications/[id]/form GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat formulir" },
      { status: error.message === "Pendaftaran tidak ditemukan" ? 404 : 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = await saveAdminApplicationForm(id, {
      answers: body.answers ?? {},
      submit: Boolean(body.submit),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[spmb-admin/applications/[id]/form PUT]", error);
    const status =
      error.message?.includes("belum") ||
      error.message?.includes("tidak dapat") ||
      error.message?.includes("terverifikasi")
        ? 403
        : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan formulir" },
      { status }
    );
  }
}
