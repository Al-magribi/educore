import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { activateAdmissionAcademicYear } from "@/modules/spmb/academic-years.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const academicYear = await activateAdmissionAcademicYear(id);
    return NextResponse.json({ academicYear, message: "Tahun pelajaran diaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/academic-years/[id]/activate POST]", error);
    const status = error.message === "Tahun pelajaran tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan tahun pelajaran" },
      { status }
    );
  }
}
