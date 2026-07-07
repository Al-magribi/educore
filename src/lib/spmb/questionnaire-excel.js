import * as XLSX from "xlsx";

const QUESTION_TYPES = {
  PILIHAN: "pilihan",
  JAWABAN_PANJANG: "jawaban_panjang",
};

const SHEET_INFO = "Info";
const SHEET_SOAL = "Soal";
const SHEET_PANDUAN = "Panduan";

const KATEGORI_VALUES = new Set(["gaya_belajar", "kepribadian", "survey", "custom"]);

const KATEGORI_ALIASES = {
  "gaya belajar": "gaya_belajar",
  kepribadian: "kepribadian",
  survey: "survey",
  "survey umum": "survey",
  custom: "custom",
};

const JENIS_ALIASES = {
  pilihan: QUESTION_TYPES.PILIHAN,
  "pilihan ganda": QUESTION_TYPES.PILIHAN,
  pg: QUESTION_TYPES.PILIHAN,
  jawaban_panjang: QUESTION_TYPES.JAWABAN_PANJANG,
  "jawaban panjang": QUESTION_TYPES.JAWABAN_PANJANG,
  esai: QUESTION_TYPES.JAWABAN_PANJANG,
  essay: QUESTION_TYPES.JAWABAN_PANJANG,
};

const OPTION_COLUMNS = ["opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e", "opsi_f"];

const TEMPLATE_SAMPLE = {
  title: "Kuesioner Baru",
  schema: {
    type: "custom",
    description: "",
    questions: [],
  },
};

function cell(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeKey(value) {
  return cell(value).toLowerCase().replace(/\s+/g, "_");
}

function parseJenisSoal(raw) {
  const key = cell(raw).toLowerCase();
  if (!key) return QUESTION_TYPES.PILIHAN;
  return JENIS_ALIASES[key] ?? (key.includes("jawaban") || key.includes("esai") || key.includes("essay")
    ? QUESTION_TYPES.JAWABAN_PANJANG
    : QUESTION_TYPES.PILIHAN);
}

function parseKategori(raw) {
  const key = cell(raw).toLowerCase();
  if (KATEGORI_VALUES.has(key)) return key;
  return KATEGORI_ALIASES[key] ?? "custom";
}

function makeQuestionId(index) {
  return `q${index + 1}`;
}

function makeOptionId(questionId, optIndex) {
  return `${questionId}_${String.fromCharCode(97 + optIndex)}`;
}

function draftToRows(draft) {
  const schema = draft?.schema ?? TEMPLATE_SAMPLE.schema;
  const title = draft?.title ?? TEMPLATE_SAMPLE.title;

  const infoRows = [
    ["field", "value", "keterangan"],
    ["judul_kuesioner", title, "Wajib diisi"],
    [
      "kategori",
      schema.type ?? "custom",
      "gaya_belajar | kepribadian | survey | custom",
    ],
    ["deskripsi", schema.description ?? "", "Opsional — tampil ke calon siswa"],
  ];

  const soalHeader = ["no", "jenis_soal", "pertanyaan", "placeholder", ...OPTION_COLUMNS];
  const soalRows = [soalHeader];

  for (const [index, question] of (schema.questions ?? []).entries()) {
    const row = {
      no: index + 1,
      jenis_soal:
        question.type === QUESTION_TYPES.JAWABAN_PANJANG ? "jawaban_panjang" : "pilihan",
      pertanyaan: question.text ?? "",
      placeholder: question.placeholder ?? "",
    };
    const labels =
      question.type === QUESTION_TYPES.PILIHAN
        ? (question.options ?? []).map((o) => (typeof o === "string" ? o : o.label))
        : [];
    OPTION_COLUMNS.forEach((col, i) => {
      row[col] = labels[i] ?? "";
    });
    soalRows.push(soalHeader.map((h) => row[h] ?? ""));
  }

  return { infoRows, soalRows };
}

function buildPanduanRows() {
  return [
    ["Panduan Import Kuesioner Excel"],
    [""],
    ["1. Isi sheet Info: judul, kategori, dan deskripsi kuesioner."],
    ["2. Isi sheet Soal: satu baris per pertanyaan."],
    ["3. jenis_soal: gunakan 'pilihan' atau 'jawaban_panjang' (boleh juga 'Pilihan ganda' / 'Esai')."],
    ["4. Soal pilihan: isi minimal 2 opsi pada kolom opsi_a, opsi_b, dst."],
    ["5. Soal jawaban panjang: kosongkan kolom opsi, isi placeholder jika perlu."],
    ["6. Baris kosong pada sheet Soal akan diabaikan."],
    ["7. Simpan file .xlsx lalu impor melalui tombol Impor Excel di admin."],
    [""],
    ["Kategori yang valid:"],
    ["- gaya_belajar"],
    ["- kepribadian"],
    ["- survey"],
    ["- custom"],
  ];
}

export function createQuestionnaireWorkbook(draft = null) {
  const { infoRows, soalRows } = draftToRows(draft);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoRows), SHEET_INFO);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(soalRows), SHEET_SOAL);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildPanduanRows()), SHEET_PANDUAN);

  return wb;
}

export function downloadQuestionnaireExcel(filename, draft = null) {
  const wb = createQuestionnaireWorkbook(draft);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export function exportQuestionnaireToExcel(draft) {
  downloadQuestionnaireExcel(
    `kuesioner-${(draft?.title || "export").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 40)}.xlsx`,
    draft
  );
}

function sheetToObjects(ws) {
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

function readInfoSheet(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const map = {};

  for (const row of rows) {
    const key = normalizeKey(row[0]);
    const value = cell(row[1]);
    if (!key || key === "field") continue;
    map[key] = value;
  }

  return {
    title: map.judul_kuesioner || map.judul || "",
    type: parseKategori(map.kategori),
    description: map.deskripsi || "",
  };
}

function readSoalSheet(ws) {
  const rows = sheetToObjects(ws);
  const questions = [];

  for (const row of rows) {
    const text = cell(row.pertanyaan ?? row.soal ?? row.pertanyaan_);
    if (!text) continue;

    const no = Number(row.no) || questions.length + 1;
    const questionId = makeQuestionId(no - 1);
    const type = parseJenisSoal(row.jenis_soal ?? row.jenis ?? row.tipe);

    if (type === QUESTION_TYPES.JAWABAN_PANJANG) {
      questions.push({
        id: questionId,
        type: QUESTION_TYPES.JAWABAN_PANJANG,
        text,
        placeholder: cell(row.placeholder) || "Tuliskan jawaban Anda...",
        options: [],
      });
      continue;
    }

    const optionLabels = [];
    for (const col of OPTION_COLUMNS) {
      const label = cell(row[col]);
      if (label) optionLabels.push(label);
    }
    // Also support opsi_1, opsi_2 format
    for (let i = 1; i <= 10; i += 1) {
      const label = cell(row[`opsi_${i}`]);
      if (label && !optionLabels.includes(label)) optionLabels.push(label);
    }

    if (optionLabels.length < 2) {
      throw new Error(`Soal no. ${no}: soal pilihan wajib memiliki minimal 2 opsi (kolom opsi_a, opsi_b, ...)`);
    }

    questions.push({
      id: questionId,
      type: QUESTION_TYPES.PILIHAN,
      text,
      placeholder: "",
      options: optionLabels.map((label, i) => ({
        id: makeOptionId(questionId, i),
        label,
      })),
    });
  }

  return questions;
}

export function parseQuestionnaireExcel(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: "array" });

  const infoSheet = wb.Sheets[SHEET_INFO] ?? wb.Sheets[wb.SheetNames[0]];
  const soalSheet =
    wb.Sheets[SHEET_SOAL] ??
    wb.Sheets[wb.SheetNames.find((n) => n.toLowerCase() === "soal") ?? ""] ??
    wb.Sheets[wb.SheetNames[1]];

  if (!soalSheet) {
    throw new Error('Sheet "Soal" tidak ditemukan. Gunakan template Excel yang disediakan.');
  }

  const info = readInfoSheet(infoSheet);
  const questions = readSoalSheet(soalSheet);

  if (!info.title) {
    throw new Error('Judul kuesioner wajib diisi pada sheet Info (field "judul_kuesioner").');
  }

  if (!questions.length) {
    throw new Error("Tidak ada soal valid pada sheet Soal. Isi kolom pertanyaan minimal satu baris.");
  }

  return {
    title: info.title,
    schema: {
      type: info.type,
      description: info.description,
      questions,
    },
  };
}

export async function parseQuestionnaireExcelFile(file) {
  if (!file) throw new Error("File tidak ditemukan");
  const name = file.name?.toLowerCase() ?? "";
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("Format file harus .xlsx atau .xls");
  }
  const buffer = await file.arrayBuffer();
  return parseQuestionnaireExcel(buffer);
}
