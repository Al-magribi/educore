"use client";

import { useEffect, useState } from "react";
import { DEFAULT_THEME } from "@/config/site.js";

/**
 * Client hook untuk tema — nanti fetch dari API / context.
 */
export function useTheme() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    const primary = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary")
      .trim();
    if (primary) {
      setTheme((t) => ({ ...t, primary }));
    }
  }, []);

  return theme;
}
