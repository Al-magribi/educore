import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { getAdminPaymentSettings } from "@/modules/payment/settings.js";
import { deletePayment, updatePaymentStatus } from "@/modules/payment/payments.js";

async function getManualManagementAllowed() {
  const settings = await getAdminPaymentSettings();
  return !(settings?.midtransEnabled ?? false);
}

export async function PATCH(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const allowManualManagement = await getManualManagementAllowed();

    const payment = await updatePaymentStatus(id, body.status, { allowManualManagement });
    return NextResponse.json({ payment, message: "Status pembayaran diperbarui" });
  } catch (error) {
    console.error("[spmb-admin/payments PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui status pembayaran" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const result = await deletePayment(id);
    return NextResponse.json({ ...result, message: "Pembayaran dihapus" });
  } catch (error) {
    console.error("[spmb-admin/payments DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus pembayaran" },
      { status: 400 }
    );
  }
}
