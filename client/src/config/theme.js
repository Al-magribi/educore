// Design token Muse Ant Design Dashboard dengan palet brand EduCore.
// Palet: https://colorhunt.co/palette/16115e3730aaff653fffc85c
// Acuan lengkap: CLAUDE.md di root repo.

export const brandPalette = {
  navy: "#16115E",
  indigo: "#3730AA",
  coral: "#FF653F",
  amber: "#FFC85C",
};

export const museColors = {
  primary: brandPalette.indigo,
  primarySoft: "#ECEBFA",
  navy: brandPalette.navy,
  accent: brandPalette.coral,
  accentSoft: "#FFEDE8",
  warning: brandPalette.amber,
  success: "#52c41a",
  danger: "#f5222d",
  purple: "#722ed1",
  cyan: "#13c2c2",
  female: "#eb2f96",
  dark: brandPalette.navy,
  text: "#141414",
  textBody: "rgba(0, 0, 0, 0.65)",
  muted: "#8c8c8c",
  border: "#d9d9d9",
  divider: "#f0f0f0",
  bgLayout: "#fafafa",
  bgSoft: "#f5f5f5",
};

// Warna ikon/teks di atas latar tone tertentu. Default putih; amber butuh teks gelap agar terbaca.
export const museOnColor = {
  warning: brandPalette.navy,
  primarySoft: brandPalette.indigo,
  accentSoft: brandPalette.coral,
  bgSoft: brandPalette.navy,
};

export const museShadow = {
  card: "0 20px 27px rgba(0, 0, 0, 0.05)",
  icon: "0 4px 6px rgba(0, 0, 0, 0.12)",
};

export const museRadius = {
  base: 6,
  item: 8,
  card: 12,
};

export const museLayout = {
  siderWidth: 250,
  siderCollapsedWidth: 80,
};

export const museFont = '"Open Sans", Helvetica, Arial, sans-serif';

export const museTheme = {
  token: {
    colorPrimary: museColors.primary,
    colorInfo: museColors.primary,
    colorLink: museColors.primary,
    colorSuccess: museColors.success,
    colorWarning: museColors.warning,
    colorError: museColors.danger,
    colorText: museColors.text,
    colorTextHeading: museColors.navy,
    colorTextSecondary: museColors.muted,
    colorBorder: museColors.border,
    colorBgLayout: museColors.bgLayout,
    colorBgContainer: "#ffffff",
    fontFamily: museFont,
    fontSize: 14,
    borderRadius: museRadius.base,
    borderRadiusLG: museRadius.card,
    controlHeight: 40,
  },
  components: {
    Card: {
      bodyPadding: 16,
      headerFontSize: 16,
    },
    Table: {
      headerBg: "transparent",
      headerColor: museColors.muted,
      headerSplitColor: "transparent",
      cellPaddingBlock: 16,
      cellPaddingInline: 25,
      cellPaddingBlockSM: 12,
      cellPaddingInlineSM: 16,
    },
    Button: {
      fontWeight: 600,
    },
    Tabs: {
      titleFontSize: 14,
    },
    Segmented: {
      trackBg: "#ffffff",
      trackPadding: 4,
      itemColor: museColors.muted,
      itemHoverColor: museColors.navy,
      itemHoverBg: museColors.bgSoft,
      itemSelectedBg: museColors.primary,
      itemSelectedColor: "#ffffff",
    },
  },
};

// Theme khusus sidebar & header (shell) agar tidak mengubah token module lain.
export const museShellTheme = {
  token: {
    ...museTheme.token,
    controlHeight: 32,
  },
  components: {
    Menu: {
      itemBg: "transparent",
      subMenuItemBg: "transparent",
      itemColor: museColors.text,
      itemHoverColor: museColors.text,
      itemHoverBg: "rgba(0, 0, 0, 0.03)",
      itemActiveBg: "rgba(0, 0, 0, 0.05)",
      itemSelectedBg: "#ffffff",
      itemSelectedColor: museColors.navy,
      itemBorderRadius: museRadius.item,
      itemHeight: 52,
      itemMarginInline: 0,
      itemMarginBlock: 4,
      itemPaddingInline: 10,
      iconSize: 16,
      collapsedIconSize: 16,
      iconMarginInlineEnd: 12,
      activeBarBorderWidth: 0,
      groupTitleColor: museColors.muted,
    },
  },
};

// Gaya card "criclebox" Muse.
export const museCardStyle = {
  borderRadius: museRadius.card,
  boxShadow: museShadow.card,
  background: "#ffffff",
};
