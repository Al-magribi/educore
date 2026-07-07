import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  createManualApplication,
  getManualRegistrationSetup,
} from "@/modules/spmb/manual-registration.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const setup = await getManualRegistrationSetup();
    return NextResponse.json(setup);
  } catch (error) {
    console.error("[spmb-admin/applications GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat data pendaftaran" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const result = await createManualApplication({
      adminId: authResult.session.user.id,
      applicant: body.applicant ?? {},
      payment: body.payment ?? {},
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[spmb-admin/applications POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat pendaftaran" },
      { status: 400 }
    );
  }
}
