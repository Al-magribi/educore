import { NextResponse } from "next/server";
import { auth } from "@/auth.js";
import { requireCmsAdminApi } from "@/lib/api/cms-auth.js";
import { ROLES } from "@/config/roles.js";
import { createAppBackup, restoreAppBackup } from "@/modules/admin/backup.js";

export async function GET(request) {
  const authResult = await requireCmsAdminApi();
  if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const includeUploads = searchParams.get("uploads") !== "false";

    const backup = await createAppBackup({ includeUploads });
    const filename = `educore-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[backup GET]", error);
    return NextResponse.json(
      { error: error.message || "Gagal membuat backup" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== ROLES.SUPER_ADMIN) {
    return NextResponse.json(
      { error: "Hanya super admin yang dapat melakukan restore" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    await restoreAppBackup(body);
    return NextResponse.json({ message: "Backup berhasil dipulihkan" });
  } catch (error) {
    console.error("[backup POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal memulihkan backup" },
      { status: 500 }
    );
  }
}
