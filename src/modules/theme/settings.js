import { DEFAULT_THEME } from "@/config/site.js";
import { prisma } from "@/lib/db.js";

const themeSelect = {
  primary: true,
  primaryForeground: true,
  secondary: true,
  accent: true,
  isCustom: true,
  updatedAt: true,
};

export async function getThemeSettingsForAdmin() {
  const theme = await prisma.themeSettings.findUnique({
    where: { id: "default" },
    select: themeSelect,
  });

  if (!theme) {
    return { ...DEFAULT_THEME, updatedAt: null };
  }

  return theme;
}

export async function upsertThemeSettings(payload) {
  const primary = payload.primary?.trim() || DEFAULT_THEME.primary;
  const primaryForeground =
    payload.primaryForeground?.trim() || DEFAULT_THEME.primaryForeground;
  const secondary = payload.secondary?.trim() || DEFAULT_THEME.secondary;
  const accent = payload.accent?.trim() || DEFAULT_THEME.accent;

  return prisma.themeSettings.upsert({
    where: { id: "default" },
    update: {
      primary,
      primaryForeground,
      secondary,
      accent,
      isCustom: payload.isCustom ?? true,
    },
    create: {
      id: "default",
      primary,
      primaryForeground,
      secondary,
      accent,
      isCustom: payload.isCustom ?? true,
    },
    select: themeSelect,
  });
}
