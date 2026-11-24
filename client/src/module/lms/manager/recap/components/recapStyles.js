import { Grid } from "antd";

import { museCardStyle, museColors, museRadius } from "../../../../../config/theme";

const { useBreakpoint } = Grid;

/** Prefers the breakpoints passed down by Recap, falls back to a local probe. */
export const useRecapLayout = (screensProp) => {
  const fallbackScreens = useBreakpoint();
  const screens =
    screensProp && Object.keys(screensProp).length
      ? screensProp
      : fallbackScreens;

  return {
    screens,
    isMobile: !screens.md,
    isCompact: !screens.sm,
  };
};

export const surfaceCardStyle = {
  ...museCardStyle,
  width: "100%",
  minWidth: 0,
};

export const surfaceCardBody = (isMobile) => ({
  body: { padding: isMobile ? 12 : 16 },
});

/** Clips the table's horizontal scroll to the card instead of the page. */
export const tableCardStyle = {
  ...surfaceCardStyle,
  overflow: "hidden",
};

export const tableCardBody = { body: { padding: 0 } };

export const recordCardStyle = {
  borderRadius: museRadius.item,
  border: `1px solid ${museColors.divider}`,
  background: "#ffffff",
  width: "100%",
  minWidth: 0,
};

export const filterControlStyle = (isMobile, basis = 200) =>
  isMobile
    ? { width: "100%", flex: "1 1 100%", minWidth: 0 }
    : { minWidth: basis, flex: "0 1 auto", maxWidth: "100%" };

export const actionButtonStyle = (isMobile) =>
  isMobile ? { flex: "1 1 140px", minWidth: 0 } : undefined;
