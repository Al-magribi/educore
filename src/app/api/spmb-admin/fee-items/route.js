import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  createFinancialFeeItem,
  listFinancialFeeItems,
} from "@/modules/spmb/fee-items.js";

export async function GET() {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const items = await listFinancialFeeItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[spmb-admin/fee-items GET]", error);
    return NextResponse.json({ error: "Gagal memuat item persyaratan" }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const item = await createFinancialFeeItem(body);
    return NextResponse.json({ item, message: "Item persyaratan berhasil dibuat" }, { status: 201 });
  } catch (error) {
    console.error("[spmb-admin/fee-items POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat item persyaratan" },
      { status: 400 }
    );
  }
}
