import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { getAdminPaymentSettings } from "@/modules/payment/settings.js";
import { listPayments, listWaveFeeApplicants } from "@/modules/payment/payments.js";

export async function GET(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const view = searchParams.get("view");

    if (view === "wave_applicants") {
      const waveApplicants = await listWaveFeeApplicants();
      return NextResponse.json(waveApplicants);
    }

    const [result, settings] = await Promise.all([
      listPayments({ page, limit, status, category }),
      getAdminPaymentSettings(),
    ]);

    return NextResponse.json({
      ...result,
      settings: {
        midtransEnabled: settings?.midtransEnabled ?? false,
        manualEnabled: settings?.manualEnabled ?? true,
      },
    });
  } catch (error) {
    console.error("[spmb-admin/payments GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat data pembayaran" },
      { status: 500 }
    );
  }
}
