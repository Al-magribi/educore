import { isAppUploadUrl } from "@/lib/storage/urls.js";
import { prisma } from "@/lib/db.js";

const schoolSelect = {
  name: true,
  tagline: true,
  siteTitle: true,
  siteUrl: true,
  logoUrl: true,
  faviconUrl: true,
  metaDescription: true,
  metaKeywords: true,
  robotsIndex: true,
  robotsFollow: true,
  ogImageUrl: true,
  street: true,
  district: true,
  city: true,
  province: true,
  postalCode: true,
  country: true,
  phone: true,
  email: true,
  whatsapp: true,
  mapsUrl: true,
  mapEmbedUrl: true,
  officeHours: true,
  updatedAt: true,
};

const brandingSelect = {
  name: true,
  tagline: true,
  siteTitle: true,
  logoUrl: true,
  faviconUrl: true,
  updatedAt: true,
};

const seoSelect = {
  siteTitle: true,
  siteUrl: true,
  metaDescription: true,
  metaKeywords: true,
  robotsIndex: true,
  robotsFollow: true,
  ogImageUrl: true,
  updatedAt: true,
};

export async function getSchoolSettingsForAdmin() {
  return prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: schoolSelect,
  });
}

/** Nama, tagline, dan logo sekolah untuk layout publik. */
export async function getPublicSchoolBranding() {
  const school = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: { name: true, tagline: true, logoUrl: true },
  });

  const logoUrl = school?.logoUrl?.trim() ?? "";

  return {
    name: school?.name ?? "Sekolah",
    tagline: school?.tagline ?? "",
    logoUrl,
    hasLogo: isAppUploadUrl(logoUrl),
  };
}

/** Metadata SEO untuk halaman publik. */
export async function getPublicSeoMetadata() {
  const school = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: {
      name: true,
      siteTitle: true,
      siteUrl: true,
      metaDescription: true,
      metaKeywords: true,
      robotsIndex: true,
      robotsFollow: true,
      ogImageUrl: true,
      faviconUrl: true,
    },
  });

  if (!school) return null;

  const robotsParts = [];
  robotsParts.push(school.robotsIndex !== false ? "index" : "noindex");
  robotsParts.push(school.robotsFollow !== false ? "follow" : "nofollow");

  return {
    title: school.siteTitle || school.name,
    description: school.metaDescription ?? "",
    keywords: school.metaKeywords ?? "",
    robots: robotsParts.join(", "),
    siteUrl: school.siteUrl ?? "",
    ogImageUrl: school.ogImageUrl ?? "",
    faviconUrl: school.faviconUrl ?? "",
  };
}

function buildSchoolUpdate(payload, select) {
  const data = {};

  const stringFields = [
    "name",
    "tagline",
    "siteTitle",
    "siteUrl",
    "logoUrl",
    "faviconUrl",
    "metaDescription",
    "metaKeywords",
    "ogImageUrl",
    "street",
    "district",
    "city",
    "province",
    "postalCode",
    "country",
    "phone",
    "email",
    "whatsapp",
    "mapsUrl",
    "mapEmbedUrl",
  ];

  for (const key of stringFields) {
    if (payload[key] !== undefined) {
      data[key] = payload[key]?.trim?.() ? payload[key].trim() : payload[key] || null;
    }
  }

  if (payload.robotsIndex !== undefined) data.robotsIndex = Boolean(payload.robotsIndex);
  if (payload.robotsFollow !== undefined) data.robotsFollow = Boolean(payload.robotsFollow);
  if (payload.officeHours !== undefined) data.officeHours = payload.officeHours;

  return prisma.schoolSettings.upsert({
    where: { id: "default" },
    update: data,
    create: {
      id: "default",
      name: payload.name ?? "Sekolah",
      ...data,
    },
    select,
  });
}

export async function updateSchoolSettings(payload) {
  return buildSchoolUpdate(payload, schoolSelect);
}

export async function updateSchoolBranding(payload) {
  return buildSchoolUpdate(payload, brandingSelect);
}

export async function updateSchoolSeo(payload) {
  return buildSchoolUpdate(payload, seoSelect);
}

export async function updateSchoolIdentity(payload) {
  return buildSchoolUpdate(payload, {
    name: true,
    tagline: true,
    siteTitle: true,
    updatedAt: true,
  });
}
