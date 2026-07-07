import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  createAdmissionAcademicYear,
  listAdmissionAcademicYears,
} from "@/modules/spmb/academic-years.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const academicYears = await listAdmissionAcademicYears();
    return NextResponse.json({ academicYears });
  } catch (error) {
    console.error("[spmb-admin/academic-years GET]", error);
    return NextResponse.json({ error: "Gagal memuat tahun pelajaran" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const academicYear = await createAdmissionAcademicYear(body);
    return NextResponse.json(
      { academicYear, message: "Tahun pelajaran berhasil dibuat" },
      { status: 201 }
    );
  } catch (error) {
    console.error("[spmb-admin/academic-years POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat tahun pelajaran" },
      { status: 400 }
    );
  }
}
