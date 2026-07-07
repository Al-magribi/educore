import * as XLSX from "xlsx";

const QUESTION_TYPE_LABELS = {
  pilihan: "Pilihan ganda",
  jawaban_panjang: "Jawaban panjang",
};

function sanitizeSheetName(name, used) {
  const base = String(name || "Kuesioner")
    .replace(/[\\/*?:\[\]]/g, "-")
    .slice(0, 28)
    .trim() || "Kuesioner";
  let candidate = base;
  let index = 2;
  while (used.has(candidate)) {
    const suffix = ` (${index})`;
    candidate = `${base.slice(0, 28 - suffix.length)}${suffix}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function formatAnswerLabel(label) {
  if (label == null || label === "" || label === "—") return "";
  return String(label);
}

function buildSummaryRows(responses) {
  const header = [
    "nama",
    "email",
    "kuesioner",
    "status_pendaftaran",
    "terjawab",
    "total_soal",
    "lengkap",
    "waktu_kirim",
  ];
  const rows = responses.map((row) => [
    row.applicantName ?? "",
    row.applicantEmail ?? "",
    row.questionnaireTitle ?? "",
    row.applicationStatus ?? "",
    row.answeredCount ?? 0,
    row.totalQuestions ?? 0,
    row.isComplete ? "Ya" : "Tidak",
    row.submittedAt ?? "",
  ]);
  return [header, ...rows];
}

function buildDetailRows(responses) {
  const header = [
    "nama",
    "email",
    "kuesioner",
    "no_soal",
    "pertanyaan",
    "jenis_soal",
    "jawaban",
    "waktu_kirim",
  ];
  const rows = [];

  for (const response of responses) {
    for (const [index, detail] of (response.answerDetails ?? []).entries()) {
      rows.push([
        response.applicantName ?? "",
        response.applicantEmail ?? "",
        response.questionnaireTitle ?? "",
        index + 1,
        detail.questionText ?? "",
        QUESTION_TYPE_LABELS[detail.questionType] ?? detail.questionType ?? "",
        formatAnswerLabel(detail.answerLabel),
        response.submittedAt ?? "",
      ]);
    }
  }

  return [header, ...rows];
}

function buildWideSheetsByQuestionnaire(responses) {
  const grouped = new Map();

  for (const response of responses) {
    const key = response.questionnaireId ?? response.questionnaireTitle ?? "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(response);
  }

  const usedNames = new Set(["Ringkasan", "Detail Jawaban"]);
  const sheets = [];

  for (const group of grouped.values()) {
    const sample = group[0];
    const questionHeaders = (sample.answerDetails ?? []).map((detail, index) => {
      const text = String(detail.questionText ?? "").trim();
      return text ? `${index + 1}. ${text}` : `Soal ${index + 1}`;
    });

    const header = [
      "nama",
      "email",
      "status_pendaftaran",
      "terjawab",
      "total_soal",
      "lengkap",
      "waktu_kirim",
      ...questionHeaders,
    ];

    const rows = group.map((response) => [
      response.applicantName ?? "",
      response.applicantEmail ?? "",
      response.applicationStatus ?? "",
      response.answeredCount ?? 0,
      response.totalQuestions ?? 0,
      response.isComplete ? "Ya" : "Tidak",
      response.submittedAt ?? "",
      ...(response.answerDetails ?? []).map((detail) => formatAnswerLabel(detail.answerLabel)),
    ]);

    sheets.push({
      name: sanitizeSheetName(sample.questionnaireTitle, usedNames),
      rows: [header, ...rows],
    });
  }

  return sheets;
}

export function createQuestionnaireResponsesWorkbook(responses) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildSummaryRows(responses)),
    "Ringkasan"
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildDetailRows(responses)),
    "Detail Jawaban"
  );

  for (const sheet of buildWideSheetsByQuestionnaire(responses)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name);
  }

  return wb;
}

function buildExportFilename({ filterLabel } = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = filterLabel
    ? filterLabel
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40)
    : "semua-kuesioner";
  return `hasil-kuesioner-${slug}-${date}.xlsx`;
}

export function downloadQuestionnaireResponsesExcel(responses, options = {}) {
  if (!responses?.length) {
    throw new Error("Tidak ada jawaban untuk diekspor");
  }

  const wb = createQuestionnaireResponsesWorkbook(responses);
  const filename = buildExportFilename(options);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
