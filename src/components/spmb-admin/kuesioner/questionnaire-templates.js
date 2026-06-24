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

function q(id, text, options) {
  return {
    id,
    type: QUESTION_TYPES.PILIHAN,
    text,
    options: options.map((label, i) => ({
      id: `${id}_${String.fromCharCode(97 + i)}`,
      label,
    })),
  };
}

function longQ(id, text, placeholder = "") {
  return {
    id,
    type: QUESTION_TYPES.JAWABAN_PANJANG,
    text,
    placeholder,
    options: [],
  };
}

export const QUESTIONNAIRE_TEMPLATES = [
  {
    id: "blank",
    label: "Kosong",
    description: "Mulai dari nol dengan satu pertanyaan pilihan",
    title: "Kuesioner Baru",
    schema: {
      type: "custom",
      description: "",
      questions: [q("q1", "Pertanyaan pertama", ["Opsi A", "Opsi B"])],
    },
  },
  {
    id: "gaya_belajar",
    label: "Gaya Belajar",
    description: "5 soal pilihan ganda tentang preferensi belajar",
    title: "Tes Gaya Belajar",
    schema: {
      type: "gaya_belajar",
      description: "Identifikasi preferensi belajar calon siswa.",
      questions: [
        q("q1", "Saat mempelajari materi baru, saya paling suka...", [
          "Melihat diagram atau video",
          "Mendengarkan penjelasan guru",
          "Langsung mencoba sendiri",
        ]),
        q("q2", "Saat mengerjakan PR, saya biasanya...", [
          "Membaca catatan dan buku",
          "Berdiskusi dengan teman atau keluarga",
          "Mengerjakan langsung sambil praktik",
        ]),
        q("q3", "Saya lebih mudah mengingat informasi melalui...", [
          "Gambar, warna, dan tulisan",
          "Penjelasan lisan dan musik",
          "Aktivitas fisik dan simulasi",
        ]),
        q("q4", "Di kelas, saya paling aktif saat...", [
          "Guru menulis/menampilkan visual di papan",
          "Guru menjelaskan dan bertanya",
          "Ada praktik atau eksperimen",
        ]),
        q("q5", "Saat belajar sendiri, lingkungan ideal saya adalah...", [
          "Tenang dengan buku dan catatan rapi",
          "Bisa mendengarkan penjelasan audio",
          "Bisa bergerak dan mencoba langsung",
        ]),
      ],
    },
  },
  {
    id: "kepribadian",
    label: "Kepribadian",
    description: "Soal pilihan ganda + refleksi jawaban panjang",
    title: "Kuesioner Kepribadian",
    schema: {
      type: "kepribadian",
      description: "Mengenal karakter dan kebiasaan calon siswa.",
      questions: [
        q("q1", "Dalam kelompok, saya cenderung...", [
          "Memimpin dan mengambil keputusan",
          "Mendengarkan dan menyeimbangkan pendapat",
          "Bekerja mandiri sesuai bagian saya",
        ]),
        q("q2", "Saat menghadapi tantangan, saya biasanya...", [
          "Langsung mencari solusi praktis",
          "Menganalisis dulu sebelum bertindak",
          "Meminta masukan dari orang lain",
        ]),
        q("q3", "Saya merasa paling nyaman ketika...", [
          "Ada jadwal dan aturan yang jelas",
          "Ada ruang untuk kreativitas",
          "Bisa berkolaborasi dengan banyak orang",
        ]),
        longQ(
          "q4",
          "Ceritakan pengalaman Anda yang paling membentuk karakter (min. 2 kalimat).",
          "Tuliskan pengalaman yang menurut Anda penting..."
        ),
        longQ(
          "q5",
          "Apa kelebihan dan kekurangan yang ingin Anda kembangkan di sekolah baru?",
          "Jelaskan secara jujur dan singkat..."
        ),
      ],
    },
  },
  {
    id: "survey",
    label: "Survey Umum",
    description: "Kombinasi pilihan ganda dan esai singkat",
    title: "Survey Calon Siswa",
    schema: {
      type: "survey",
      description: "Pertanyaan umum untuk memahami latar belakang calon siswa.",
      questions: [
        q("q1", "Dari mana Anda mengetahui sekolah ini?", [
          "Teman atau keluarga",
          "Media sosial / internet",
          "Kunjungan ke sekolah / open house",
          "Lainnya",
        ]),
        q("q2", "Motivasi utama mendaftar ke sekolah ini adalah...", [
          "Akademik dan prestasi",
          "Lingkungan dan pembinaan karakter",
          "Fasilitas dan ekstrakurikuler",
          "Kedekatan lokasi",
        ]),
        longQ(
          "q3",
          "Mengapa Anda memilih sekolah ini? Jelaskan harapan Anda.",
          "Tuliskan alasan dan harapan Anda..."
        ),
        longQ(
          "q4",
          "Kegiatan atau minat apa yang ingin Anda kembangkan di sekolah ini?",
          "Olahraga, seni, organisasi, dll."
        ),
      ],
    },
  },
];

export function createQuestion(type = QUESTION_TYPES.PILIHAN) {
  const id = `q_${Date.now().toString(36)}`;
  if (type === QUESTION_TYPES.JAWABAN_PANJANG) {
    return {
      id,
      type: QUESTION_TYPES.JAWABAN_PANJANG,
      text: "Pertanyaan baru",
      placeholder: "Tuliskan jawaban Anda...",
      options: [],
    };
  }
  return {
    id,
    type: QUESTION_TYPES.PILIHAN,
    text: "Pertanyaan baru",
    options: [
      { id: `${id}_a`, label: "Opsi A" },
      { id: `${id}_b`, label: "Opsi B" },
    ],
  };
}

export function getQuestionTypeLabel(type) {
  return QUESTION_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Pilihan ganda";
}
