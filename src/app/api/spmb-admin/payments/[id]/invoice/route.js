import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import { getInvoiceData, issueInvoice } from "@/modules/payment/invoice.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const invoice = await getInvoiceData(id);
    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("[spmb-admin/payments/invoice GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memuat invoice" },
      { status: 400 }
    );
  }
}

export async function POST(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const invoice = await issueInvoice(id);
    return NextResponse.json({
      invoice,
      message: "Invoice berhasil diterbitkan",
    });
  } catch (error) {
    console.error("[spmb-admin/payments/invoice POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menerbitkan invoice" },
      { status: 400 }
    );
  }
}
