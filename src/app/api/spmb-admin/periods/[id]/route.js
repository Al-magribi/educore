import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteAdmissionPeriod,
  getAdmissionPeriod,
  updateAdmissionPeriod,
} from "@/modules/spmb/periods.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const period = await getAdmissionPeriod(id);
    if (!period) {
      return NextResponse.json({ error: "Periode tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ period });
  } catch (error) {
    console.error("[spmb-admin/periods/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat periode" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const period = await updateAdmissionPeriod(id, body);
    return NextResponse.json({ period, message: "Periode berhasil disimpan" });
  } catch (error) {
    console.error("[spmb-admin/periods/[id] PUT]", error);
    const status = error.message === "Periode tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan periode" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteAdmissionPeriod(id);
    return NextResponse.json({ message: "Periode berhasil dihapus" });
  } catch (error) {
    console.error("[spmb-admin/periods/[id] DELETE]", error);
    const status = error.message === "Periode tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus periode" },
      { status }
    );
  }
}
