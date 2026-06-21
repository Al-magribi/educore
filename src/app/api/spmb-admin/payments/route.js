import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { getAdminPaymentSettings } from "@/modules/payment/settings.js";
import { listPayments } from "@/modules/payment/payments.js";

export async function GET(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const status = searchParams.get("status");

    const [result, settings] = await Promise.all([
      listPayments({ page, limit, status }),
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
