import { homeData } from "@/data/home-dummy.js";

/** Default `content` untuk section hero & spmb_cta saat pertama kali dibuat. */
export function getDefaultSectionContent(type) {
  if (type === "hero") {
    const { hero } = homeData;
    return {
      imageUrl: null,
      imageAlt: hero.imageAlt ?? "",
      overlayOpacity: hero.overlayOpacity ?? 0.72,
      badge: hero.badge ?? "",
      title: hero.title ?? "",
      subtitle: hero.subtitle ?? "",
      ctaLabel: hero.ctaLabel ?? "",
      ctaHref: hero.ctaHref ?? "",
      secondaryCtaLabel: hero.secondaryCtaLabel ?? "",
      secondaryCtaHref: hero.secondaryCtaHref ?? "",
      stats: hero.stats ?? [],
    };
  }

  if (type === "spmb_cta") {
    const { spmbCta } = homeData;
    return {
      title: spmbCta.title ?? "",
      description: spmbCta.description ?? "",
      href: spmbCta.href ?? "/spmb",
      deadline: spmbCta.deadline ?? "",
      highlights: spmbCta.highlights ?? [],
    };
  }

  if (type === "alumni_testimonials") {
    return {
      eyebrow: "",
      title: "",
      description: "",
    };
  }

  if (type === "contact") {
    return {
      eyebrow: "",
      title: "",
      description: "",
    };
  }

  return null;
}

/** Default items untuk section berbasis kartu. Prestasi & ekstrakurikuler dimulai kosong. */
export function getDefaultSectionItems(_type) {
  return [];
}
