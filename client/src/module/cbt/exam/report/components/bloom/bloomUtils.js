export const levelColorMap = {
  1: "gold",
  2: "lime",
  3: "green",
  4: "cyan",
  5: "blue",
  6: "magenta",
};

export const statusMetaMap = {
  correct: { label: "Benar", color: "green", textColor: "#15803d" },
  incorrect: { label: "Salah", color: "red", textColor: "#dc2626" },
  unanswered: { label: "Kosong", color: "default", textColor: "#64748b" },
  pending_review: { label: "Pending", color: "gold", textColor: "#d97706" },
};

export const metricCardStyle = {
  borderRadius: 18,
  background: "#f8fafc",
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.14)",
};

export const sectionStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  overflow: "hidden",
};

export const normalizeQuestionText = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getLevelKey = (level) =>
  level === null || level === undefined ? "none" : String(level);

export const getBloomCode = (level) => (level ? `C${level}` : "N/A");

export const getBloomName = (record = {}) => {
  const label = String(record.bloom_label || "Tanpa Level");
  if (!record.bloom_level) return label;
  return label.replace(new RegExp(`^C${record.bloom_level}\\s*`, "i"), "") || label;
};

export const getBloomTitle = (record = {}) =>
  record.bloom_level
    ? `${getBloomCode(record.bloom_level)} ${getBloomName(record)}`
    : getBloomName(record);

export const createStats = () => ({
  total_questions: 0,
  total_students: 0,
  correct_count: 0,
  incorrect_count: 0,
  unanswered_count: 0,
  pending_review_count: 0,
});

export const addStatus = (stats, status) => {
  if (status === "correct") stats.correct_count += 1;
  else if (status === "incorrect") stats.incorrect_count += 1;
  else if (status === "pending_review") stats.pending_review_count += 1;
  else stats.unanswered_count += 1;
};

export const toPercentage = (part, total) =>
  total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;

export const formatPercent = (value) => `${Math.round(Number(value || 0))}%`;

export const getMasteryMeta = (value) => {
  const percentage = Number(value || 0);
  if (percentage >= 85) return { label: "Sangat kuat", color: "green" };
  if (percentage >= 70) return { label: "Kuat", color: "cyan" };
  if (percentage >= 55) return { label: "Cukup", color: "blue" };
  if (percentage >= 40) return { label: "Perlu penguatan", color: "orange" };
  return { label: "Prioritas remedial", color: "red" };
};

export const getTeachingFocus = (value) => {
  const percentage = Number(value || 0);
  if (percentage >= 85) return "Pertahankan dan beri pengayaan";
  if (percentage >= 70) return "Latihan variasi soal";
  if (percentage >= 55) return "Latihan terarah";
  if (percentage >= 40) return "Ulang konsep kunci";
  return "Remedial prasyarat";
};

export const sortBloomRows = (rows) =>
  [...rows].sort((a, b) => {
    const levelA = a.bloom_level ?? 999;
    const levelB = b.bloom_level ?? 999;
    return levelA - levelB;
  });

export const getStudentId = (student) =>
  String(student?.id ?? student?.student_id ?? "");

export const getClassValue = (item) =>
  String(item?.class_id ?? item?.id ?? item?.class_name ?? item?.name ?? "");
