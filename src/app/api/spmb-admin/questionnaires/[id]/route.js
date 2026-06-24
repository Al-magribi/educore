import { NextResponse } from "next/server";
import { requireSpmbAdminApi } from "@/lib/api/spmb-auth.js";
import {
  deleteQuestionnaire,
  getQuestionnaire,
  updateQuestionnaire,
} from "@/modules/spmb/questionnaires.js";

export async function GET(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const questionnaire = await getQuestionnaire(id);
    if (!questionnaire) {
      return NextResponse.json({ error: "Kuesioner tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ questionnaire });
  } catch (error) {
    console.error("[spmb-admin/questionnaires/[id] GET]", error);
    return NextResponse.json({ error: "Gagal memuat kuesioner" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const questionnaire = await updateQuestionnaire(id, body);
    return NextResponse.json({ questionnaire, message: "Kuesioner berhasil diperbarui" });
  } catch (error) {
    console.error("[spmb-admin/questionnaires/[id] PUT]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui kuesioner" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request, { params }) {
  const authResult = await requireSpmbAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    await deleteQuestionnaire(id);
    return NextResponse.json({ message: "Kuesioner berhasil dihapus" });
  } catch (error) {
    console.error("[spmb-admin/questionnaires/[id] DELETE]", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus kuesioner" },
      { status: 400 }
    );
  }
}
