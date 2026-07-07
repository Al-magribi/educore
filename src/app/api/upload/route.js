import { NextResponse } from "next/server";
import { auth } from "@/auth.js";
import {
  UPLOAD_CATEGORY_ROLES,
  UPLOAD_DOCUMENT_MIME_TO_EXT,
  UPLOAD_MAX_BYTES,
  saveUploadedImage,
} from "@/lib/storage/index.js";

export const runtime = "nodejs";

function canUpload(role, category) {
  const allowed = UPLOAD_CATEGORY_ROLES[category];
  if (!allowed) return false;
  return allowed.includes(role);
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const category = String(formData.get("category") || "cms").toLowerCase();

    if (!canUpload(session.user.role, category)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File wajib diunggah" }, { status: 400 });
    }

    if (file.size > UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        { error: `Ukuran file maksimal ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";

    const result = await saveUploadedImage(category, buffer, mimeType);

    const isDocument = Boolean(UPLOAD_DOCUMENT_MIME_TO_EXT[result.mimeType]);

    return NextResponse.json({
      url: result.url,
      size: result.size,
      originalSize: result.originalSize,
      mimeType: result.mimeType,
      message: isDocument
        ? "Berkas berhasil diunggah"
        : "Gambar berhasil diunggah dan dioptimasi",
    });
  } catch (error) {
    console.error("[upload POST]", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengunggah gambar" },
      { status: 500 }
    );
  }
}
