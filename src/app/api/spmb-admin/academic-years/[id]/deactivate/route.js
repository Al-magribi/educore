import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { deactivateAdmissionAcademicYear } from "@/modules/spmb/academic-years.js";

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const academicYear = await deactivateAdmissionAcademicYear(id);
    return NextResponse.json({ academicYear, message: "Tahun pelajaran dinonaktifkan" });
  } catch (error) {
    console.error("[spmb-admin/academic-years/[id]/deactivate POST]", error);
    const status = error.message === "Tahun pelajaran tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menonaktifkan tahun pelajaran" },
      { status }
    );
  }
}
