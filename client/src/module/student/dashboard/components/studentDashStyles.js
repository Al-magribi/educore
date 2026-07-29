export const SUBJECTS_PER_PAGE_DESKTOP = 4;
export const SUBJECTS_PER_PAGE_MOBILE = 3;

export const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export const slideVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const iconWrapStyle = (background, color) => ({
  width: 42,
  height: 42,
  borderRadius: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

export const cardStyle = {
  borderRadius: 24,
  border: "1px solid #eef2f7",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
  height: "100%",
  width: "100%",
  overflow: "hidden",
};

export const statCardStyle = {
  ...cardStyle,
  borderRadius: 18,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
};

export const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  background:
    "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
  color: "#fff",
  boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
  width: "100%",
};

export const heroTagStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  margin: 0,
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const listItemStyle = {
  borderRadius: 18,
  border: "1px solid #e5efff",
  background: "linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%)",
  marginBottom: 12,
  padding: "14px 16px",
};

export const examItemStyle = {
  borderRadius: 18,
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  marginBottom: 12,
  padding: "14px 16px",
};

export const cardHeadStyles = ({ isMobile, isXs }) => ({
  header: {
    borderBottom: "1px solid #f1f5f9",
    minHeight: isMobile ? 56 : 64,
    paddingInline: isXs ? 12 : isMobile ? 14 : 24,
    flexWrap: "wrap",
    gap: 8,
    rowGap: 10,
  },
  body: {
    padding: isXs ? 12 : isMobile ? 14 : 24,
    paddingTop: isMobile ? 12 : 16,
  },
});

export const sectionWrapStyle = {
  width: "100%",
  minWidth: 0,
};
