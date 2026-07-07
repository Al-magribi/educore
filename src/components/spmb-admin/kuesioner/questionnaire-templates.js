export const QUESTION_TYPES = {
  PILIHAN: "pilihan",
  JAWABAN_PANJANG: "jawaban_panjang",
};

export const QUESTION_TYPE_OPTIONS = [
  { value: QUESTION_TYPES.PILIHAN, label: "Pilihan ganda", description: "Satu jawaban dari beberapa opsi" },
  {
    value: QUESTION_TYPES.JAWABAN_PANJANG,
    label: "Jawaban panjang",
    description: "Respons teks bebas dari calon siswa",
  },
];

export const KUESIONER_TYPE_OPTIONS = [
  { value: "gaya_belajar", label: "Gaya belajar" },
  { value: "kepribadian", label: "Kepribadian" },
  { value: "survey", label: "Survey umum" },
  { value: "custom", label: "Custom" },
];

export const QUESTIONNAIRE_TEMPLATES = [
  {
    id: "blank",
    label: "Kosong",
    description: "Mulai dari nol tanpa judul atau kategori bawaan",
    title: "Kuesioner Baru",
    schema: {
      type: "custom",
      description: "",
      questions: [],
    },
  },
  {
    id: "gaya_belajar",
    label: "Gaya Belajar",
    description: "Kategori gaya belajar — tambahkan soal sendiri",
    title: "Tes Gaya Belajar",
    schema: {
      type: "gaya_belajar",
      description: "Identifikasi preferensi belajar calon siswa.",
      questions: [],
    },
  },
  {
    id: "kepribadian",
    label: "Kepribadian",
    description: "Kategori kepribadian — tambahkan soal sendiri",
    title: "Kuesioner Kepribadian",
    schema: {
      type: "kepribadian",
      description: "Mengenal karakter dan kebiasaan calon siswa.",
      questions: [],
    },
  },
  {
    id: "survey",
    label: "Survey Umum",
    description: "Kategori survey umum — tambahkan soal sendiri",
    title: "Survey Calon Siswa",
    schema: {
      type: "survey",
      description: "Pertanyaan umum untuk memahami latar belakang calon siswa.",
      questions: [],
    },
  },
];

export function createQuestion(type = QUESTION_TYPES.PILIHAN) {
  const id = `q_${Date.now().toString(36)}`;
  if (type === QUESTION_TYPES.JAWABAN_PANJANG) {
    return {
      id,
      type: QUESTION_TYPES.JAWABAN_PANJANG,
      text: "",
      placeholder: "",
      options: [],
    };
  }
  return {
    id,
    type: QUESTION_TYPES.PILIHAN,
    text: "",
    options: [
      { id: `${id}_a`, label: "" },
      { id: `${id}_b`, label: "" },
    ],
  };
}

export function getQuestionTypeLabel(type) {
  return QUESTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Pilihan ganda";
}
