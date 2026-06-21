import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { activateAdmissionPeriod } from "@/modules/spmb/periods.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const period = await activateAdmissionPeriod(id);
    return NextResponse.json({ period, message: "Periode diaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/periods/[id]/activate POST]", error);
    const status = error.message === "Periode tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan periode" },
      { status }
    );
  }
}
