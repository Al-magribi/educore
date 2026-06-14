import {
  HeroSection,
  AchievementsGrid,
  ExtracurricularCards,
  AlumniTestimonials,
  SpmbCtaCard,
  HomeNewsSection,
} from "@/components/cms/index.js";
import { AddressContact } from "@/components/about/AddressContact.js";

export function HomeView({ data, newsPosts = [] }) {
  const { hero, achievements, extracurricular, testimonials, testimonialsHeading, spmbCta, address } =
    data;

  return (
    <>
      <HeroSection
        imageUrl={hero.imageUrl}
        imageAlt={hero.imageAlt}
        overlayOpacity={hero.overlayOpacity}
        badge={hero.badge}
        title={hero.title}
        subtitle={hero.subtitle}
        ctaLabel={hero.ctaLabel}
        ctaHref={hero.ctaHref}
        secondaryCtaLabel={hero.secondaryCtaLabel}
        secondaryCtaHref={hero.secondaryCtaHref}
        stats={hero.stats}
      />
      <AchievementsGrid items={achievements} prioritizeFirst={!hero.imageUrl} />
      <ExtracurricularCards items={extracurricular} />
      {testimonials.length > 0 && (
        <AlumniTestimonials items={testimonials} heading={testimonialsHeading} />
      )}
      <SpmbCtaCard
        title={spmbCta.title}
        description={spmbCta.description}
        href={spmbCta.href}
        deadline={spmbCta.deadline}
        highlights={spmbCta.highlights}
      />
      <HomeNewsSection posts={newsPosts} />
      {address && <AddressContact address={address} />}
    </>
  );
}
