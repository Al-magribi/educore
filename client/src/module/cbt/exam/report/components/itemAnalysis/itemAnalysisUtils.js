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

export const formatIndex = (value, digits = 3) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(digits);
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "-";
  }
  return `${Math.round(Number(value))}%`;
};

export const difficultyColorMap = {
  easy: "green",
  moderate: "blue",
  hard: "orange",
};

export const discriminationColorMap = {
  good: "green",
  fair: "blue",
  weak: "orange",
  problematic: "red",
  unknown: "default",
};

export const recommendationColorMap = {
  keep: "green",
  retire: "orange",
  discard: "red",
};

const toExportValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value);
};

const mapQuestionRows = (questions = []) =>
  questions.map((item) => ({
    No: item.no,
    Soal: normalizeQuestionText(item.question),
    Tipe: item.type_label || "",
    Benar: item.correct_count ?? 0,
    Salah: item.incorrect_count ?? 0,
    Pending: item.pending_review_count ?? 0,
    "Peserta Dianalisis": item.analyzed_students ?? 0,
    "Kesukaran (P)": toExportValue(item.difficulty_index),
    "Kategori Kesukaran": item.difficulty_label || "",
    "Point-biserial (rpb)": toExportValue(item.point_biserial),
    "Kategori Point-biserial": item.point_biserial_label || "",
    "Indeks D (27%)": toExportValue(item.discrimination_index),
    "Kategori Indeks D": item.discrimination_label || "",
    Rekomendasi: item.recommendation_label || "",
    Alasan: (item.recommendation_reasons || []).join("; "),
  }));

export const exportItemAnalysisExcel = async ({ data, examName } = {}) => {
  const XLSX = await import("xlsx");
  const summary = data?.summary || {};
  const questions = data?.per_question || [];
  const rejected = data?.rejected_questions || [];

  const summaryRows = [
    { Metrik: "Nama Ujian", Nilai: examName || data?.exam?.name || "-" },
    {
      Metrik: "Sertakan Esai & Isian",
      Nilai: data?.include_essay ? "Ya" : "Tidak",
    },
    { Metrik: "Total Soal Bank", Nilai: data?.total_questions ?? 0 },
    { Metrik: "Soal Dianalisis", Nilai: data?.analyzed_questions ?? 0 },
    {
      Metrik: "Soal Esai/Isian Dikecualikan",
      Nilai: data?.excluded_essay_questions ?? 0,
    },
    { Metrik: "Total Peserta Roster", Nilai: data?.total_students ?? 0 },
    { Metrik: "Peserta Dianalisis", Nilai: data?.analyzed_students ?? 0 },
    {
      Metrik: "Cronbach's Alpha",
      Nilai:
        summary.cronbach_alpha === null || summary.cronbach_alpha === undefined
          ? ""
          : summary.cronbach_alpha,
    },
    {
      Metrik: "Kategori Alpha",
      Nilai: summary.cronbach_alpha_label || "",
    },
    {
      Metrik: "Rata-rata Kesukaran (P)",
      Nilai: toExportValue(summary.average_difficulty),
    },
    {
      Metrik: "Rata-rata Point-biserial",
      Nilai: toExportValue(summary.average_point_biserial),
    },
    {
      Metrik: "Rata-rata Indeks D",
      Nilai: toExportValue(summary.average_discrimination_index),
    },
    { Metrik: "Jumlah Pertahankan", Nilai: summary.keep_count ?? 0 },
    { Metrik: "Jumlah Tidak Disarankan", Nilai: summary.reject_count ?? 0 },
    { Metrik: "Buang / Revisi Total", Nilai: summary.discard_count ?? 0 },
    {
      Metrik: "Tidak Disarankan Dipakai Ulang",
      Nilai: summary.retire_count ?? 0,
    },
    {
      Metrik: "Peringatan Sampel",
      Nilai: data?.sample_warning
        ? data.sample_warning_message || "Ya"
        : "Tidak",
    },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(summaryRows),
    "Ringkasan",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(mapQuestionRows(questions)),
    "Analisis Per Soal",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(mapQuestionRows(rejected)),
    "Tidak Disarankan",
  );

  const safeName = String(examName || data?.exam?.name || "analisa-soal")
    .trim()
    .replace(/[/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .toLowerCase();

  XLSX.writeFile(workbook, `${safeName}-analisa-soal.xlsx`);
};
