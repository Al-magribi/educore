import { Grid } from "antd";

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
  borderRadius: 16,
  border: "1px solid #e5edf6",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
  width: "100%",
  minWidth: 0,
};

export const surfaceCardBody = (isMobile) => ({
  body: { padding: isMobile ? 14 : 20 },
});

/** Clips the table's horizontal scroll to the card instead of the page. */
export const tableCardStyle = {
  ...surfaceCardStyle,
  overflow: "hidden",
};

export const tableCardBody = { body: { padding: 0 } };

export const recordCardStyle = {
  borderRadius: 14,
  border: "1px solid #e8eef6",
  background: "#ffffff",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
  width: "100%",
  minWidth: 0,
};

export const filterControlStyle = (isMobile, basis = 200) =>
  isMobile
    ? { width: "100%", flex: "1 1 100%", minWidth: 0 }
    : { minWidth: basis, flex: "0 1 auto", maxWidth: "100%" };

export const actionButtonStyle = (isMobile) =>
  isMobile ? { flex: "1 1 140px", minWidth: 0 } : undefined;
