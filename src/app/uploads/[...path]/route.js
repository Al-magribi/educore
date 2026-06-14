import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_EXT_TO_MIME } from "@/lib/storage/constants.js";
import {
  isServedFromPublicDir,
  resolveUploadRelativePath,
} from "@/lib/storage/index.js";

export const runtime = "nodejs";

/**
 * Melayani file dari UPLOAD_DIR kustom (di luar public/).
 * Jika UPLOAD_DIR = public/uploads (default), Next.js melayani file statis secara langsung.
 */
export async function GET(_request, { params }) {
  if (isServedFromPublicDir()) {
    return new NextResponse(null, { status: 404 });
  }

  const { path: pathSegments } = await params;

  try {
    const filePath = resolveUploadRelativePath(pathSegments);
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = path.extname(filePath).slice(1).toLowerCase();
    const contentType = UPLOAD_EXT_TO_MIME[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
