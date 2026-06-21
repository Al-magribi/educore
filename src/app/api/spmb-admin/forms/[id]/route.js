import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteFormDefinition,
  getFormDefinition,
  updateFormDefinition,
} from "@/modules/spmb/forms.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const form = await getFormDefinition(id);
    if (!form) {
      return NextResponse.json({ error: "Formulir tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ form });
  } catch (error) {
    console.error("[spmb-admin/forms/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat formulir" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    const body = await request.json();
    const form = await updateFormDefinition(id, body);
    return NextResponse.json({ form, message: "Formulir berhasil disimpan" });
  } catch (error) {
    console.error("[spmb-admin/forms/[id] PUT]", error);
    const status = error.message === "Formulir tidak ditemukan" ? 404 : 400;
    return NextResponse.json(
      { error: error.message || "Gagal menyimpan formulir" },
      { status }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  const { id } = await params;

  try {
    await deleteFormDefinition(id);
    return NextResponse.json({ message: "Formulir berhasil dihapus" });
  } catch (error) {
    console.error("[spmb-admin/forms/[id] DELETE]", error);
    const status = error.message === "Formulir tidak ditemukan" ? 404 : 500;
    return NextResponse.json(
      { error: error.message || "Gagal menghapus formulir" },
      { status }
    );
  }
}
