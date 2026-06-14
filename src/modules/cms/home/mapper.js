import { sanitizePublicImageUrl } from "@/lib/images.js";

/**
 * Memetakan record Prisma → bentuk yang dipakai komponen publik.
 */

function mapAchievementItem(item) {
  return {
    id: item.id,
    title: item.title ?? "",
    description: item.description ?? "",
    imageUrl: sanitizePublicImageUrl(item.imageUrl) ?? "",
    imageAlt: item.imageAlt ?? "",
  };
}

function mapTestimonialItem(item) {
  const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
  return {
    id: item.id,
    quote: meta.quote ?? item.description ?? "",
    author: meta.author ?? item.title ?? "",
    role: meta.role ?? "",
    year: meta.year ?? "",
    imageUrl: sanitizePublicImageUrl(item.imageUrl),
    imageAlt: item.imageAlt ?? "",
  };
}

function mapHeroContent(content) {
  const c = content && typeof content === "object" ? content : {};
  return {
    imageUrl: sanitizePublicImageUrl(c.imageUrl),
    imageAlt: c.imageAlt ?? "",
    overlayOpacity: typeof c.overlayOpacity === "number" ? c.overlayOpacity : 0.72,
    badge: c.badge ?? "",
    title: c.title ?? "",
    subtitle: c.subtitle ?? "",
    ctaLabel: c.ctaLabel ?? "",
    ctaHref: c.ctaHref ?? "",
    secondaryCtaLabel: c.secondaryCtaLabel ?? "",
    secondaryCtaHref: c.secondaryCtaHref ?? "",
    stats: Array.isArray(c.stats) ? c.stats : [],
  };
}

function mapSectionHeading(content) {
  const c = content && typeof content === "object" ? content : {};
  return {
    eyebrow: c.eyebrow ?? "",
    title: c.title ?? "",
    description: c.description ?? "",
  };
}

function mapSpmbCtaContent(content) {
  const c = content && typeof content === "object" ? content : {};
  return {
    title: c.title ?? "",
    description: c.description ?? "",
    href: c.href ?? "/spmb",
    deadline: c.deadline ?? "",
    highlights: Array.isArray(c.highlights) ? c.highlights : [],
  };
}

/**
 * @param {import("@prisma/client").HomeSection[]} sections
 * @param {{ name?: string, tagline?: string } | null} school
 * @param {object | null} schoolAddress
 */
function buildSchoolAddress(school, contactContent) {
  if (!school) return null;

  const hasContactDetails = [
    school.street,
    school.district,
    school.city,
    school.province,
    school.postalCode,
    school.phone,
    school.email,
    school.whatsapp,
    school.mapsUrl,
    school.mapEmbedUrl,
  ].some(Boolean) || (Array.isArray(school.officeHours) && school.officeHours.length > 0);

  if (!hasContactDetails) return null;

  const heading = mapSectionHeading(contactContent);

  return {
    ...heading,
    schoolName: school.name,
    street: school.street,
    district: school.district,
    city: school.city,
    province: school.province,
    postalCode: school.postalCode,
    country: school.country,
    phone: school.phone,
    email: school.email,
    whatsapp: school.whatsapp,
    mapsUrl: school.mapsUrl,
    officeHours: school.officeHours,
    mapEmbedUrl: school.mapEmbedUrl,
  };
}

export function mapSectionsToHomeData(sections, school) {
  const byType = Object.fromEntries(sections.map((s) => [s.type, s]));

  const heroSection = byType.hero;
  const achievementsSection = byType.achievements;
  const extracurricularSection = byType.extracurricular;
  const testimonialsSection = byType.alumni_testimonials;
  const spmbSection = byType.spmb_cta;
  const contactSection = byType.contact;

  const hero =
    heroSection?.isPublished !== false
      ? mapHeroContent(heroSection?.content)
      : mapHeroContent({});

  const achievements =
    achievementsSection?.isPublished !== false
      ? (achievementsSection?.items ?? []).map(mapAchievementItem)
      : [];

  const extracurricular =
    extracurricularSection?.isPublished !== false
      ? (extracurricularSection?.items ?? []).map(mapAchievementItem)
      : [];

  const testimonialsPublished = testimonialsSection?.isPublished !== false;
  const testimonials = testimonialsPublished
    ? (testimonialsSection?.items ?? []).map(mapTestimonialItem)
    : [];

  const testimonialsHeading = testimonialsPublished
    ? mapSectionHeading(testimonialsSection?.content)
    : null;

  const spmbCta =
    spmbSection?.isPublished !== false
      ? mapSpmbCtaContent(spmbSection?.content)
      : mapSpmbCtaContent({});

  const address =
    contactSection?.isPublished !== false ? buildSchoolAddress(school, contactSection?.content) : null;

  return {
    school: {
      name: school?.name ?? "Sekolah",
      tagline: school?.tagline ?? "",
    },
    hero,
    achievements,
    extracurricular,
    testimonials,
    testimonialsHeading,
    spmbCta,
    address,
  };
}

/**
 * @param {import("@prisma/client").HomeSection & { items: import("@prisma/client").HomeSectionItem[] }} section
 */
export function mapSectionForAdmin(section) {
  return {
    id: section.id,
    type: section.type,
    sortOrder: section.sortOrder,
    isPublished: section.isPublished,
    content: section.content ?? null,
    updatedAt: section.updatedAt.toISOString(),
    items: (section.items ?? []).map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl,
      imageAlt: item.imageAlt,
      linkUrl: item.linkUrl,
      metadata: item.metadata ?? null,
    })),
  };
}
