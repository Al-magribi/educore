import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteFinancialFeeItem,
  getFinancialFeeItem,
  updateFinancialFeeItem,
} from "@/modules/spmb/fee-items.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const item = await getFinancialFeeItem(id);
    if (!item) {
      return NextResponse.json({ error: "Item persyaratan tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[spmb-admin/fee-items/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat item persyaratan" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const item = await updateFinancialFeeItem(id, body);
    return NextResponse.json({ item, message: "Item persyaratan disimpan" });
  } catch (error) {
    console.error("[spmb-admin/fee-items/[id] PUT]", error);
    const status = error.message === "Item persyaratan tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan item persyaratan" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteFinancialFeeItem(id);
    return NextResponse.json({ message: "Item persyaratan dihapus" });
  } catch (error) {
    console.error("[spmb-admin/fee-items/[id] DELETE]", error);
    const status = error.message === "Item persyaratan tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus item persyaratan" },
      { status }
    );
  }
}
