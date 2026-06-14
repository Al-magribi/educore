import { DEFAULT_THEME } from "@/config/site.js";
import { prisma } from "@/lib/db.js";

export async function getThemeSettings() {
  const theme = await prisma.themeSettings.findUnique({
    where: { id: "default" },
  });

  if (!theme) {
    return DEFAULT_THEME;
  }

  return {
    primary: theme.primary,
    primaryForeground: theme.primaryForeground,
    secondary: theme.secondary,
    accent: theme.accent,
    isCustom: theme.isCustom,
  };
}
