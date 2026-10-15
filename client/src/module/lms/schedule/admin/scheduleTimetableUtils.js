export const HEADER_BG = "#e7c1a3";
export const HEADER_SUB_BG = "#f3d8c2";
export const SLOT_BG = "#f8f1c7";
export const SURFACE_BG = "#fffdf8";
export const BORDER_COLOR = "#d9c7b8";
export const STRONG_BORDER = `2px solid ${BORDER_COLOR}`;

const SUBJECT_COLOR_PALETTE = [
  { bg: "#fde68a", text: "#7c2d12", border: "#f59e0b" },
  { bg: "#bfdbfe", text: "#1e3a8a", border: "#60a5fa" },
  { bg: "#fecaca", text: "#991b1b", border: "#f87171" },
  { bg: "#c7f9cc", text: "#166534", border: "#4ade80" },
  { bg: "#e9d5ff", text: "#6b21a8", border: "#c084fc" },
  { bg: "#fed7aa", text: "#9a3412", border: "#fb923c" },
  { bg: "#ddd6fe", text: "#5b21b6", border: "#8b5cf6" },
  { bg: "#bae6fd", text: "#0c4a6e", border: "#38bdf8" },
  { bg: "#fbcfe8", text: "#9d174d", border: "#f472b6" },
  { bg: "#d9f99d", text: "#365314", border: "#84cc16" },
];

export const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

export const getSubjectColor = (code) => {
  const normalized = String(code || "-")
    .trim()
    .toUpperCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash =
      (hash * 31 + normalized.charCodeAt(index)) % SUBJECT_COLOR_PALETTE.length;
  }
  return SUBJECT_COLOR_PALETTE[hash];
};
