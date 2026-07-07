import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteApplication,
  getApplicationDetail,
  resetApplicationToSubmitted,
  updateApplicationStatus,
} from "@/modules/spmb/applications.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const application = await getApplicationDetail(id);
    return NextResponse.json({ application });
  } catch (error) {
    console.error("[spmb-admin/applications GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat detail pendaftaran" },
      { status: error.message === "Pendaftaran tidak ditemukan" ? 404 : 400 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const result = await deleteApplication(id);
    return NextResponse.json({
      ...result,
      message: "Pendaftaran dan formulir terkait berhasil dihapus",
    });
  } catch (error) {
    console.error("[spmb-admin/applications DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus pendaftaran" },
      { status: error.message === "Pendaftaran tidak ditemukan" ? 404 : 400 }
    );
  }
}

export async function PATCH(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === "reset") {
      const application = await resetApplicationToSubmitted(id);
      return NextResponse.json({
        application,
        message: "Status pendaftaran direset ke diajukan",
      });
    }

    const application = await updateApplicationStatus(
      id,
      body.status,
      authResult.session.user.id
    );
    return NextResponse.json({ application, message: "Status pendaftaran diperbarui" });
  } catch (error) {
    console.error("[spmb-admin/applications PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui status pendaftaran" },
      { status: 400 }
    );
  }
}
