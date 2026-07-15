import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_EXT_TO_MIME } from "@/lib/storage/constants.js";
import { resolveUploadRelativePath } from "@/lib/storage/index.js";

export const runtime = "nodejs";

/**
 * Melayani file upload dari disk (UPLOAD_DIR atau public/uploads).
 *
 * Route ini wajib ada: di App Router, `app/uploads/[...path]/route.js`
 * menimpa static serving dari `public/uploads`, jadi file yang diunggah
 * setelah build tidak bisa dilayani tanpa handler ini.
 */
export async function GET(_request, { params }) {
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
