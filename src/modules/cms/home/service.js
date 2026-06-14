import { prisma } from "@/lib/db.js";
import { assertAppUploadUrl } from "@/lib/storage/urls.js";
import {
  HOME_SECTION_SORT_ORDER,
  HOME_SECTION_TYPES,
  ITEMS_SECTIONS,
  SECTIONS_WITH_CONTENT,
} from "./constants.js";
import { homeData } from "@/data/home-dummy.js";
import { getDefaultSectionContent, getDefaultSectionItems } from "./defaults.js";
import { mapSectionForAdmin, mapSectionsToHomeData } from "./mapper.js";

const sectionInclude = {
  items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
};

const LEGACY_TESTIMONIAL_SIGNATURES = [
  {
    title: "Aisha Rahma Putri",
    description:
      "EduCore membentuk saya tidak hanya pintar secara akademik, tetapi juga percaya diri berkomunikasi dan memimpin tim.",
  },
  {
    title: "Bima Aditya Wijaya",
    description:
      "Guru-guru sangat peduli. Lingkungan belajar yang kondusif membuat saya berani mengejar impian di bidang sains.",
  },
  {
    title: "Ibu Siti Nurhaliza",
    description:
      "Sebagai orang tua, saya merasa anak saya tumbuh dengan nilai-nilai yang kuat dan prestasi yang membanggakan.",
  },
];

const LEGACY_SCHOOL_CONTACT = {
  street: "Jl. Pendidikan No. 88, Kelurahan Educore",
  district: "Kecamatan Cerdas",
  city: "Kota Nusantara",
  province: "Jawa Barat",
  postalCode: "40123",
  phone: "+62 22 1234 5678",
  email: "info@educorenusantara.sch.id",
  whatsapp: "+62 812 3456 7890",
};

const LEGACY_SCHOOL_OFFICE_HOURS = [
  { day: "Senin – Jumat", time: "07.00 – 15.30 WIB" },
  { day: "Sabtu", time: "07.00 – 12.00 WIB" },
];

function isLegacyTestimonials(items) {
  if (items.length !== LEGACY_TESTIMONIAL_SIGNATURES.length) return false;

  return LEGACY_TESTIMONIAL_SIGNATURES.every((legacyItem, index) => {
    const item = items[index];
    return item?.title === legacyItem.title && item?.description === legacyItem.description;
  });
}

function isLegacySeedItems(items, legacyItems) {
  if (items.length !== legacyItems.length) return false;

  return legacyItems.every((legacyItem, index) => {
    const item = items[index];
    return item?.title === legacyItem.title && item?.description === legacyItem.description;
  });
}

async function cleanupLegacyHomeData() {
  const testimonialSection = await prisma.homeSection.findFirst({
    where: { type: "alumni_testimonials" },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
  });

  if (testimonialSection && isLegacyTestimonials(testimonialSection.items)) {
    await prisma.homeSectionItem.deleteMany({
      where: { sectionId: testimonialSection.id },
    });
  }

  for (const type of ["achievements", "extracurricular"]) {
    const legacyItems = homeData[type] ?? [];
    if (legacyItems.length === 0) continue;

    const section = await prisma.homeSection.findFirst({
      where: { type },
      include: { items: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } },
    });

    if (section && isLegacySeedItems(section.items, legacyItems)) {
      await prisma.homeSectionItem.deleteMany({
        where: { sectionId: section.id },
      });
    }
  }

  const school = await prisma.schoolSettings.findUnique({
    where: { id: "default" },
    select: {
      id: true,
      street: true,
      district: true,
      city: true,
      province: true,
      postalCode: true,
      phone: true,
      email: true,
      whatsapp: true,
      officeHours: true,
    },
  });

  if (!school) return;

  const update = Object.fromEntries(
    Object.entries(LEGACY_SCHOOL_CONTACT)
      .filter(([key, value]) => school[key] === value)
      .map(([key]) => [key, null])
  );

  if (Object.keys(update).length > 0) {
    await prisma.schoolSettings.update({
      where: { id: school.id },
      data: update,
    });
  }

  if (JSON.stringify(school.officeHours ?? null) === JSON.stringify(LEGACY_SCHOOL_OFFICE_HOURS)) {
    await prisma.schoolSettings.update({
      where: { id: school.id },
      data: { officeHours: [] },
    });
  }
}

export async function ensureHomeSections() {
  await cleanupLegacyHomeData();

  const existing = await prisma.homeSection.findMany({
    include: { items: { select: { id: true } } },
  });
  const existingTypes = new Set(existing.map((s) => s.type));

  for (const type of HOME_SECTION_TYPES) {
    if (existingTypes.has(type)) continue;

    const defaultContent = getDefaultSectionContent(type);
    const section = await prisma.homeSection.create({
      data: {
        type,
        sortOrder: HOME_SECTION_SORT_ORDER[type] ?? 0,
        isPublished: true,
        content: defaultContent,
      },
    });

    const defaultItems = getDefaultSectionItems(type);
    if (defaultItems.length > 0) {
      await prisma.homeSectionItem.createMany({
        data: defaultItems.map((item) => ({
          sectionId: section.id,
          sortOrder: item.sortOrder,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          imageAlt: item.imageAlt,
          metadata: item.metadata,
        })),
      });
    }
  }

  const sections = await prisma.homeSection.findMany({
    include: { items: { select: { id: true } } },
  });

  for (const section of sections) {
    if (SECTIONS_WITH_CONTENT.has(section.type) && section.content == null) {
      await prisma.homeSection.update({
        where: { id: section.id },
        data: { content: getDefaultSectionContent(section.type) },
      });
    }

    if (!ITEMS_SECTIONS.has(section.type) || section.items.length > 0) continue;

    const defaultItems = getDefaultSectionItems(section.type);
    if (defaultItems.length === 0) continue;

    await prisma.homeSectionItem.createMany({
      data: defaultItems.map((item) => ({
        sectionId: section.id,
        sortOrder: item.sortOrder,
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        imageAlt: item.imageAlt,
        metadata: item.metadata,
      })),
    });
  }
}

export async function getPublicHomeData() {
  await ensureHomeSections();

  const [sections, school] = await Promise.all([
    prisma.homeSection.findMany({
      orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
      include: sectionInclude,
    }),
    prisma.schoolSettings.findUnique({ where: { id: "default" } }),
  ]);

  return mapSectionsToHomeData(sections, school);
}

export async function getAdminHomeSections() {
  await ensureHomeSections();

  const sections = await prisma.homeSection.findMany({
    orderBy: [{ sortOrder: "asc" }, { type: "asc" }],
    include: sectionInclude,
  });

  return sections.map(mapSectionForAdmin);
}

export async function getHomeSectionByType(type) {
  const section = await prisma.homeSection.findFirst({
    where: { type },
    include: sectionInclude,
  });

  if (!section) return null;
  return mapSectionForAdmin(section);
}

function normalizeSectionContent(type, content) {
  if (content === undefined) return undefined;
  if (type === "hero") {
    return {
      ...content,
      imageUrl: assertAppUploadUrl(content.imageUrl, { optional: true }),
    };
  }
  return content;
}

function normalizeItemPayload(payload, { imageOptional = false } = {}) {
  return {
    ...payload,
    imageUrl: assertAppUploadUrl(payload.imageUrl, { optional: imageOptional }),
  };
}

export async function updateHomeSection(type, { isPublished, content }) {
  const section = await prisma.homeSection.findFirst({ where: { type } });
  if (!section) {
    throw new Error("Section tidak ditemukan");
  }

  if (content !== undefined && !SECTIONS_WITH_CONTENT.has(type)) {
    throw new Error("Section ini tidak mendukung pengeditan content langsung");
  }

  const normalizedContent = normalizeSectionContent(type, content);

  const updated = await prisma.homeSection.update({
    where: { id: section.id },
    data: {
      ...(typeof isPublished === "boolean" ? { isPublished } : {}),
      ...(normalizedContent !== undefined ? { content: normalizedContent } : {}),
    },
    include: sectionInclude,
  });

  return mapSectionForAdmin(updated);
}

export async function createHomeSectionItem(type, payload) {
  const section = await prisma.homeSection.findFirst({ where: { type } });
  if (!section) throw new Error("Section tidak ditemukan");

  const imageOptional = type === "alumni_testimonials";
  const normalized = normalizeItemPayload(payload, { imageOptional });

  const maxOrder = await prisma.homeSectionItem.aggregate({
    where: { sectionId: section.id },
    _max: { sortOrder: true },
  });

  const item = await prisma.homeSectionItem.create({
    data: {
      sectionId: section.id,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      title: normalized.title ?? null,
      description: normalized.description ?? null,
      imageUrl: normalized.imageUrl ?? null,
      imageAlt: normalized.imageAlt ?? null,
      linkUrl: normalized.linkUrl ?? null,
      metadata: normalized.metadata ?? null,
    },
  });

  return {
    id: item.id,
    sortOrder: item.sortOrder,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    linkUrl: item.linkUrl,
    metadata: item.metadata,
  };
}

export async function updateHomeSectionItem(itemId, payload) {
  const existing = await prisma.homeSectionItem.findUnique({
    where: { id: itemId },
    include: { section: { select: { type: true } } },
  });
  if (!existing) throw new Error("Item tidak ditemukan");

  const imageOptional = existing.section.type === "alumni_testimonials";
  let imageUrl = payload.imageUrl;
  if (payload.imageUrl !== undefined) {
    imageUrl = assertAppUploadUrl(payload.imageUrl, { optional: imageOptional });
  }

  const item = await prisma.homeSectionItem.update({
    where: { id: itemId },
    data: {
      ...(payload.title !== undefined ? { title: payload.title || null } : {}),
      ...(payload.description !== undefined ? { description: payload.description || null } : {}),
      ...(payload.imageUrl !== undefined ? { imageUrl: imageUrl ?? null } : {}),
      ...(payload.imageAlt !== undefined ? { imageAlt: payload.imageAlt || null } : {}),
      ...(payload.linkUrl !== undefined ? { linkUrl: payload.linkUrl || null } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
      ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
    },
  });

  return {
    id: item.id,
    sortOrder: item.sortOrder,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    imageAlt: item.imageAlt,
    linkUrl: item.linkUrl,
    metadata: item.metadata,
  };
}

export async function deleteHomeSectionItem(itemId) {
  await prisma.homeSectionItem.delete({ where: { id: itemId } });
}

export async function reorderHomeSectionItems(type, orderedIds) {
  const section = await prisma.homeSection.findFirst({ where: { type } });
  if (!section) throw new Error("Section tidak ditemukan");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.homeSectionItem.update({
        where: { id, sectionId: section.id },
        data: { sortOrder: index },
      })
    )
  );

  return getHomeSectionByType(type);
}
