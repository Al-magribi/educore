import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { updateApplicationStatus } from "@/modules/spmb/applications.js";

export async function PATCH(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
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
