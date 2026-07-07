import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteAdmissionAcademicYear,
  getAdmissionAcademicYear,
  updateAdmissionAcademicYear,
} from "@/modules/spmb/academic-years.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const academicYear = await getAdmissionAcademicYear(id);
    if (!academicYear) {
      return NextResponse.json({ error: "Tahun pelajaran tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ academicYear });
  } catch (error) {
    console.error("[spmb-admin/academic-years/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat tahun pelajaran" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const academicYear = await updateAdmissionAcademicYear(id, body);
    return NextResponse.json({ academicYear, message: "Tahun pelajaran berhasil disimpan" });
  } catch (error) {
    console.error("[spmb-admin/academic-years/[id] PUT]", error);
    const status = error.message === "Tahun pelajaran tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan tahun pelajaran" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteAdmissionAcademicYear(id);
    return NextResponse.json({ message: "Tahun pelajaran berhasil dihapus" });
  } catch (error) {
    console.error("[spmb-admin/academic-years/[id] DELETE]", error);
    const status = error.message === "Tahun pelajaran tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus tahun pelajaran" },
      { status }
    );
  }
}
