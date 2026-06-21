import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  createAdmissionPeriod,
  listAdmissionPeriods,
} from "@/modules/spmb/periods.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const periods = await listAdmissionPeriods();
    return NextResponse.json({ periods });
  } catch (error) {
    console.error("[spmb-admin/periods GET]", error);
    return NextResponse.json({ error: "Gagal memuat periode SPMB" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const period = await createAdmissionPeriod(body);
    return NextResponse.json({ period, message: "Periode berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[spmb-admin/periods POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat periode" },
      { status: 400 }
    );
  }
}
