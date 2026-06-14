"use client";

import { PaginatedImageCardsSection } from "./PaginatedImageCardsSection.js";

export function AchievementsGrid({ items = [], prioritizeFirst = false }) {
  return (
    <PaginatedImageCardsSection
      items={items}
      eyebrow="Prestasi"
      title="Kebanggaan Sekolah Kami"
      description="Pencapaian siswa dan institusi yang membuktikan komitmen kami pada excellence."
      badgeLabel="Prestasi"
      sectionClassName="bg-slate-50 py-20 md:py-28"
      prioritizeFirst={prioritizeFirst}
    />
  );
}
