import { prisma } from "@/lib/db.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

function getAppBaseUrl(siteUrl) {
  const fromDb = siteUrl?.trim()?.replace(/\/$/, "");
  if (fromDb) return fromDb;

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return null;
}

function resolveAbsoluteUrl(path, siteUrl) {
  const trimmed = path?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = getAppBaseUrl(siteUrl);
  if (!base) return null;

  return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

/** Nama, tagline, dan logo sekolah untuk template email (URL logo absolut). */
export async function getSchoolBrandingForEmail() {
  const school = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: { name: true, tagline: true, logoUrl: true, siteUrl: true },
  });

  const name = school?.name?.trim() || "EduCore SPMB";
  const tagline = school?.tagline?.trim() || "Portal Penerimaan Siswa Baru";
  const rawLogo = school?.logoUrl?.trim() ?? "";
  const logoUrl = resolveAbsoluteUrl(rawLogo, school?.siteUrl);
  const hasLogo = isAppUploadUrl(rawLogo) && Boolean(logoUrl);

  return { name, tagline, logoUrl, hasLogo };
}
