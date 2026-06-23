import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

/** @deprecated Use spmbLandingDefaults — kept for backward compatibility */
export const spmbLandingData = {
  ...spmbLandingDefaults,
  page: {
    ...spmbLandingDefaults.page,
    imageUrl:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80",
    imageAlt: "Calon siswa baru SMA EduCore",
  },
};
