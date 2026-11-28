import dayjs from "dayjs";

export const DEFAULT_MODULE_HEADING = "MODUL AJAR KURIKULUM MERDEKA";

export const PANCASILA_PROFILE_OPTIONS = [
  "Beriman, Bertakwa kepada Tuhan Yang Maha Esa, dan Berakhlak Mulia",
  "Berkebinekaan Global",
  "Bergotong-royong",
  "Mandiri",
  "Bernalar Kritis",
  "Kreatif",
].map((value) => ({ label: value, value }));

export const IDENTITY_FIELDS = [
  { key: "author", label: "Penyusun" },
  { key: "institution", label: "Instansi" },
  { key: "year", label: "Tahun Penyusunan" },
  { key: "level", label: "Jenjang Sekolah" },
  { key: "subject", label: "Mata Pelajaran" },
  { key: "phase_class_semester", label: "Fase / Kelas / Semester" },
  { key: "time_allocation", label: "Alokasi Waktu" },
];

// Urutan & huruf mengikuti format Modul Ajar Kurikulum Merdeka.
export const GENERAL_SECTIONS = [
  { key: "initial_competence", letter: "B", label: "Kompetensi Awal" },
  { key: "pancasila_profile", letter: "C", label: "Profil Pelajar Pancasila" },
  { key: "facilities", letter: "D", label: "Sarana dan Prasarana" },
  { key: "target_students", letter: "E", label: "Target Peserta Didik" },
  { key: "learning_model", letter: "F", label: "Model Pembelajaran" },
];

export const CORE_SECTIONS = [
  { key: "objectives", letter: "A", label: "Tujuan Kegiatan Pembelajaran" },
  { key: "meaningful_understanding", letter: "B", label: "Pemahaman Bermakna" },
  { key: "trigger_questions", letter: "C", label: "Pertanyaan Pemantik" },
  { key: "meetings", letter: "D", label: "Kegiatan Pembelajaran" },
  { key: "reflection", letter: "E", label: "Refleksi" },
  { key: "assessment", letter: "F", label: "Penilaian" },
  {
    key: "enrichment_remedial",
    letter: "G",
    label: "Kegiatan Pengayaan dan Remedial",
  },
];

export const MEETING_PARTS = [
  { key: "opening", label: "Kegiatan Pendahuluan" },
  { key: "main", label: "Kegiatan Inti" },
  { key: "closing", label: "Kegiatan Penutup" },
];

export const APPENDIX_SECTIONS = [
  { key: "worksheets", letter: "A", label: "Lembar Kerja Peserta Didik" },
  { key: "reading_materials", letter: "B", label: "Bahan Bacaan Guru & Peserta Didik" },
  { key: "glossary", letter: "C", label: "Glosarium" },
  { key: "bibliography", letter: "D", label: "Daftar Pustaka" },
];

const ORDINAL_WORDS = [
  "pertama",
  "kedua",
  "ketiga",
  "keempat",
  "kelima",
  "keenam",
  "ketujuh",
  "kedelapan",
  "kesembilan",
  "kesepuluh",
];

export const getMeetingDefaultTitle = (index) =>
  `Pertemuan ${ORDINAL_WORDS[index] || `ke-${index + 1}`}`;

export const createEmptyMeeting = (index = 0) => ({
  title: getMeetingDefaultTitle(index),
  opening: "",
  main: "",
  closing: "",
});

const levelLabel = (homebaseLevel) => {
  const value = String(homebaseLevel || "").trim();
  return value ? value.toUpperCase() : "";
};

export const buildDefaultContent = ({ meta = {}, gradeName = "" } = {}) => {
  const lastSignature = meta.last_signature || {};
  return {
    heading: DEFAULT_MODULE_HEADING,
    cover_url: "",
    identity: {
      author: meta.teacher_name || "",
      institution: meta.homebase_name || "",
      year: `Tahun ${dayjs().year()}`,
      level: levelLabel(meta.homebase_level),
      subject: meta.subject_name || "",
      phase_class_semester: gradeName ? `- / ${gradeName} / -` : "",
      time_allocation: "",
    },
    general: {
      initial_competence: "",
      pancasila_profile: [],
      facilities: "",
      target_students: "",
      learning_model: "",
    },
    core: {
      objectives: "",
      meaningful_understanding: "",
      trigger_questions: "",
      meetings: [createEmptyMeeting(0)],
      learning_notes: "",
      reflection: "",
      assessment: "",
      enrichment_remedial: "",
    },
    appendix: {
      worksheets: "",
      reading_materials: "",
      glossary: "",
      bibliography: "",
    },
    signature: {
      city: lastSignature.city || "",
      date: dayjs().format("YYYY-MM-DD"),
      principal_name: lastSignature.principal_name || "",
      principal_nip: lastSignature.principal_nip || "",
      teacher_name: meta.teacher_name || "",
      teacher_nip: meta.teacher_nip || "",
    },
  };
};

// Isi lama bisa kehilangan kunci baru; gabungkan dengan default agar form & PDF aman.
export const normalizeContent = (content, defaults = buildDefaultContent()) => {
  const source = content && typeof content === "object" ? content : {};
  const meetings =
    Array.isArray(source.core?.meetings) && source.core.meetings.length > 0
      ? source.core.meetings.map((item, index) => ({
          ...createEmptyMeeting(index),
          ...item,
        }))
      : defaults.core.meetings;

  return {
    heading: source.heading || defaults.heading,
    cover_url: typeof source.cover_url === "string" ? source.cover_url : "",
    identity: { ...defaults.identity, ...(source.identity || {}) },
    general: {
      ...defaults.general,
      ...(source.general || {}),
      pancasila_profile: Array.isArray(source.general?.pancasila_profile)
        ? source.general.pancasila_profile
        : defaults.general.pancasila_profile,
    },
    core: { ...defaults.core, ...(source.core || {}), meetings },
    appendix: { ...defaults.appendix, ...(source.appendix || {}) },
    signature: { ...defaults.signature, ...(source.signature || {}) },
  };
};

export const formatSignatureDate = (value) => {
  if (!value) return "";
  const date = dayjs(value);
  if (!date.isValid()) return String(value);
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${date.date()} ${months[date.month()]} ${date.year()}`;
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return "-";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
