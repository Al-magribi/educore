import { museCardStyle, museColors, museRadius } from "../../../../config/theme";

export const SCHEDULE_SURFACE_BORDER = `1px solid ${museColors.divider}`;

export const SCHEDULE_CARD_STYLE = {
  ...museCardStyle,
  width: "100%",
  maxWidth: "100%",
  overflow: "hidden",
};

export const SCHEDULE_CARD_BODY = {
  padding: 16,
};

export const SCHEDULE_CARD_BODY_MOBILE = {
  padding: 12,
};

export const SCHEDULE_INNER_CARD_STYLE = {
  borderRadius: museRadius.item,
  border: SCHEDULE_SURFACE_BORDER,
  background: "#ffffff",
  width: "100%",
  maxWidth: "100%",
};

export const SCHEDULE_INNER_CARD_BODY = {
  padding: 16,
};

export const SCHEDULE_INNER_CARD_BODY_MOBILE = {
  padding: 12,
};

export const SCHEDULE_MUTED_PANEL_STYLE = {
  borderRadius: museRadius.item,
  border: SCHEDULE_SURFACE_BORDER,
  background: museColors.bgLayout,
};

export const SCHEDULE_TAG_STYLE = {
  margin: 0,
  borderRadius: museRadius.base,
  paddingInline: 10,
  fontWeight: 600,
};

export const SCHEDULE_ICON_BOX = {
  width: 32,
  height: 32,
  display: "grid",
  placeItems: "center",
  borderRadius: museRadius.base,
  background: museColors.primary,
  color: "#ffffff",
  flexShrink: 0,
};

export const SCHEDULE_CARD_HEADER_STYLE = {
  flexWrap: "wrap",
  rowGap: 8,
  columnGap: 8,
};

export const getScheduleCardBody = (isMobile) =>
  isMobile ? SCHEDULE_CARD_BODY_MOBILE : SCHEDULE_CARD_BODY;

export const getScheduleInnerCardBody = (isMobile) =>
  isMobile ? SCHEDULE_INNER_CARD_BODY_MOBILE : SCHEDULE_INNER_CARD_BODY;

export const getScheduleModalWidth = (isMobile, desktopWidth = 720) =>
  isMobile ? "100%" : desktopWidth;
