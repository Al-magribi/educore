import { aboutData as defaultAboutData } from "@/data/about-dummy.js";
import { prisma } from "@/lib/db.js";

const aboutSelect = {
  id: true,
  pageTitle: true,
  pageSubtitle: true,
  pageImageUrl: true,
  pageImageAlt: true,
  profileTitle: true,
  profileParagraphs: true,
  profileHighlights: true,
  visionTitle: true,
  visionContent: true,
  missionTitle: true,
  missionItems: true,
  valuesTitle: true,
  valuesItems: true,
  updatedAt: true,
};

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function asHighlights(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      label: String(item.label ?? "").trim(),
      value: String(item.value ?? "").trim(),
    }))
    .filter((item) => item.label || item.value);
}

function asValueItems(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: String(item.id ?? `value-${index + 1}`),
      title: String(item.title ?? "").trim(),
      description: String(item.description ?? "").trim(),
    }))
    .filter((item) => item.title || item.description);
}

export function mapAboutRowToPublic(row) {
  if (!row) return { ...defaultAboutData };

  return {
    page: {
      title: row.pageTitle ?? defaultAboutData.page.title,
      subtitle: row.pageSubtitle ?? defaultAboutData.page.subtitle,
      imageUrl: row.pageImageUrl ?? defaultAboutData.page.imageUrl,
      imageAlt: row.pageImageAlt ?? defaultAboutData.page.imageAlt,
    },
    profile: {
      title: row.profileTitle ?? defaultAboutData.profile.title,
      paragraphs: asStringArray(row.profileParagraphs).length
        ? asStringArray(row.profileParagraphs)
        : defaultAboutData.profile.paragraphs,
      highlights: asHighlights(row.profileHighlights).length
        ? asHighlights(row.profileHighlights)
        : defaultAboutData.profile.highlights,
    },
    vision: {
      title: row.visionTitle ?? defaultAboutData.vision.title,
      content: row.visionContent ?? defaultAboutData.vision.content,
    },
    mission: {
      title: row.missionTitle ?? defaultAboutData.mission.title,
      items: asStringArray(row.missionItems).length
        ? asStringArray(row.missionItems)
        : defaultAboutData.mission.items,
    },
    values: {
      title: row.valuesTitle ?? defaultAboutData.values.title,
      items: asValueItems(row.valuesItems).length
        ? asValueItems(row.valuesItems)
        : defaultAboutData.values.items,
    },
  };
}

function mapAboutRowToAdmin(row) {
  return {
    id: row?.id ?? "default",
    updatedAt: row?.updatedAt ?? null,
    ...mapAboutRowToPublic(row),
  };
}

function defaultCreateData() {
  return {
    id: "default",
    pageTitle: defaultAboutData.page.title,
    pageSubtitle: defaultAboutData.page.subtitle,
    pageImageUrl: defaultAboutData.page.imageUrl,
    pageImageAlt: defaultAboutData.page.imageAlt,
    profileTitle: defaultAboutData.profile.title,
    profileParagraphs: defaultAboutData.profile.paragraphs,
    profileHighlights: defaultAboutData.profile.highlights,
    visionTitle: defaultAboutData.vision.title,
    visionContent: defaultAboutData.vision.content,
    missionTitle: defaultAboutData.mission.title,
    missionItems: defaultAboutData.mission.items,
    valuesTitle: defaultAboutData.values.title,
    valuesItems: defaultAboutData.values.items,
  };
}

export async function ensureAboutPage() {
  const existing = await prisma.aboutPage.findUnique({
    where: { id: "default" },
    select: aboutSelect,
  });
  if (existing) return existing;

  return prisma.aboutPage.create({
    data: defaultCreateData(),
    select: aboutSelect,
  });
}

export async function getPublicAboutData() {
  const row = await prisma.aboutPage.findUnique({
    where: { id: "default" },
    select: aboutSelect,
  });
  return mapAboutRowToPublic(row);
}

export async function getAboutPageForAdmin() {
  const row = await ensureAboutPage();
  return mapAboutRowToAdmin(row);
}

export async function updateAboutPage(scope, body) {
  await ensureAboutPage();

  let data;

  switch (scope) {
    case "page": {
      const page = body.page ?? body;
      if (!page.title?.trim()) throw new Error("Judul halaman wajib diisi");
      data = {
        pageTitle: page.title.trim(),
        pageSubtitle: page.subtitle?.trim() || null,
        pageImageUrl: page.imageUrl?.trim() || null,
        pageImageAlt: page.imageAlt?.trim() || null,
      };
      break;
    }
    case "profile": {
      const profile = body.profile ?? body;
      if (!profile.title?.trim()) throw new Error("Judul profil wajib diisi");
      data = {
        profileTitle: profile.title.trim(),
        profileParagraphs: asStringArray(profile.paragraphs),
        profileHighlights: asHighlights(profile.highlights),
      };
      break;
    }
    case "vision-mission": {
      const vision = body.vision ?? {};
      const mission = body.mission ?? {};
      if (!vision.title?.trim()) throw new Error("Judul visi wajib diisi");
      if (!vision.content?.trim()) throw new Error("Isi visi wajib diisi");
      if (!mission.title?.trim()) throw new Error("Judul misi wajib diisi");
      data = {
        visionTitle: vision.title.trim(),
        visionContent: vision.content.trim(),
        missionTitle: mission.title.trim(),
        missionItems: asStringArray(mission.items),
      };
      break;
    }
    case "values": {
      const values = body.values ?? body;
      if (!values.title?.trim()) throw new Error("Judul nilai-nilai wajib diisi");
      data = {
        valuesTitle: values.title.trim(),
        valuesItems: asValueItems(values.items),
      };
      break;
    }
    default:
      throw new Error("Scope tidak valid");
  }

  const row = await prisma.aboutPage.update({
    where: { id: "default" },
    data,
    select: aboutSelect,
  });

  return mapAboutRowToAdmin(row);
}
