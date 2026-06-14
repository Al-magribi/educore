"use client";

import { PaginatedImageCardsSection } from "./PaginatedImageCardsSection.js";

export function ExtracurricularCards({ items = [] }) {
  return (
    <PaginatedImageCardsSection
      items={items}
      eyebrow="Ekstrakurikuler"
      title="Kembangkan Bakat & Minat"
      description="Beragam kegiatan untuk menumbuhkan kreativitas, kepemimpinan, dan kerja sama tim."
      badgeLabel="Ekskul"
      sectionClassName="bg-white py-20 md:py-28"
    />
  );
}
