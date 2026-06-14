import { DEFAULT_THEME } from "@/config/site.js";

/** Maps theme record → CSS custom properties for admin shell (palette-ready). */
export function toAdminThemeVars(theme = DEFAULT_THEME) {
  const primary = theme.primary ?? DEFAULT_THEME.primary;
  const primaryForeground = theme.primaryForeground ?? DEFAULT_THEME.primaryForeground;
  const secondary = theme.secondary ?? DEFAULT_THEME.secondary;
  const accent = theme.accent ?? DEFAULT_THEME.accent;

  return {
    "--admin-primary": primary,
    "--admin-primary-foreground": primaryForeground,
    "--admin-primary-hover": secondary,
    "--admin-secondary": secondary,
    "--admin-accent": accent,
    "--admin-primary-soft": `color-mix(in srgb, ${primary} 14%, white)`,
    "--admin-primary-muted": `color-mix(in srgb, ${primary} 8%, #f8fafc)`,
    "--admin-ring": `color-mix(in srgb, ${primary} 35%, transparent)`,
  };
}
