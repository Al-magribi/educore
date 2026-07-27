const QUESTION_TYPE_GUIDE = [
  {
    type_id: 1,
    jenis: "PG Jawaban Tunggal",
    kolom_wajib: "question_text, option_a..option_e (sesuai kebutuhan), key",
    cara_isi_key: "Satu huruf jawaban benar, contoh: A",
    catatan: "Isi opsi yang dipakai saja. Opsi kosong diabaikan.",
  },
  {
    type_id: 2,
    jenis: "PG Multi Jawaban",
    kolom_wajib: "question_text, option_a..option_e, key",
    cara_isi_key: "Beberapa huruf dipisah koma, contoh: A,C,E",
    catatan: "Semua huruf di key harus cocok dengan opsi yang diisi.",
  },
  {
    type_id: 3,
    jenis: "Uraian",
    kolom_wajib: "question_text, score_point",
    cara_isi_key: "Kosongkan (tidak dipakai)",
    catatan: "Kosongkan option_a sampai option_e dan key.",
  },
  {
    type_id: 4,
    jenis: "Isian Singkat",
    kolom_wajib: "question_text, key",
    cara_isi_key: "Variasi jawaban dipisah koma, contoh: 0, Kosong",
    catatan: "Kosongkan option_a sampai option_e.",
  },
  {
    type_id: 5,
    jenis: "Benar / Salah",
    kolom_wajib: "question_text, key",
    cara_isi_key: "Tulis tepat: Benar atau Salah",
    catatan: "Penulisan harus Benar/Salah (bukan True/False).",
  },
  {
    type_id: 6,
    jenis: "Menjodohkan",
    kolom_wajib: "question_text, option_a..option_e",
    cara_isi_key: "Kosongkan key",
    catatan: "Format tiap opsi: Sisi Kiri | Sisi Kanan. Wajib ada karakter |.",
  },
];

const BLOOM_LEVEL_GUIDE = [
  { bloom_level: 1, kode: "C1", nama: "Remembering", catatan: "Opsional" },
  { bloom_level: 2, kode: "C2", nama: "Understanding", catatan: "Opsional" },
  { bloom_level: 3, kode: "C3", nama: "Applying", catatan: "Opsional" },
  { bloom_level: 4, kode: "C4", nama: "Analyzing", catatan: "Opsional" },
  { bloom_level: 5, kode: "C5", nama: "Evaluating", catatan: "Opsional" },
  { bloom_level: 6, kode: "C6", nama: "Creating", catatan: "Opsional" },
];

const COLUMN_GUIDE = [
  {
    kolom: "type_id",
    wajib: "Ya",
    keterangan: "Angka 1–6 sesuai jenis soal di aplikasi",
  },
  {
    kolom: "bloom_level",
    wajib: "Tidak",
    keterangan: "Angka 1–6 (C1–C6). Kosongkan jika belum diatur",
  },
  {
    kolom: "question_text",
    wajib: "Ya",
    keterangan: "Teks pertanyaan / stem soal",
  },
  {
    kolom: "score_point",
    wajib: "Tidak",
    keterangan: "Bobot skor. Default 1 jika dikosongkan",
  },
  {
    kolom: "option_a … option_e",
    wajib: "Sesuai tipe",
    keterangan: "Opsi jawaban. Untuk menjodohkan: Kiri | Kanan",
  },
  {
    kolom: "key",
    wajib: "Sesuai tipe",
    keterangan: "Kunci jawaban. Lihat panduan per type_id",
  },
];

const SAMPLE_QUESTIONS = [
  {
    type_id: 1,
    bloom_level: 2,
    question_text:
      "Perhatikan ciri-ciri bangun ruang: memiliki 6 sisi sama besar. Bangun tersebut adalah?",
    score_point: 2,
    option_a: "Kubus",
    option_b: "Balok",
    option_c: "Limas",
    option_d: "Prisma",
    option_e: "",
    key: "A",
  },
  {
    type_id: 2,
    bloom_level: 3,
    question_text: "Pilih semua bilangan prima di bawah ini.",
    score_point: 4,
    option_a: "2",
    option_b: "4",
    option_c: "5",
    option_d: "9",
    option_e: "11",
    key: "A,C,E",
  },
  {
    type_id: 3,
    bloom_level: 4,
    question_text:
      "Jelaskan perbedaan antara simbiosis mutualisme dan parasitisme, lalu berikan masing-masing satu contoh.",
    score_point: 10,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    key: "",
  },
  {
    type_id: 4,
    bloom_level: 1,
    question_text: "Banyak titik sudut pada bola adalah...",
    score_point: 5,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    key: "0, Kosong",
  },
  {
    type_id: 5,
    bloom_level: 2,
    question_text:
      "Benar atau Salah: Planet terdekat dari matahari adalah Merkurius.",
    score_point: 2,
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    key: "Benar",
  },
  {
    type_id: 6,
    bloom_level: 3,
    question_text: "Pasangkan koordinat titik asal dengan hasil transformasinya.",
    score_point: 10,
    option_a: "A(3,-2) translasi (-4,5) | (-1,3)",
    option_b: "B(-6,3) refleksi sumbu Y | (6,3)",
    option_c: "C(4,1) dilatasi [0,2] | (8,2)",
    option_d: "",
    option_e: "",
    key: "",
  },
];

const setColumnWidths = (worksheet, widths) => {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
};

export const downloadTemplate = async () => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const guideIntro = XLSX.utils.aoa_to_sheet([
    ["PANDUAN IMPORT SOAL CBT"],
    [
      "Isi data hanya di sheet Template Soal. Jangan ubah nama kolom header.",
    ],
    [
      "Baris contoh boleh dihapus atau diganti. Import membaca sheet Template Soal (bukan sheet Panduan ini).",
    ],
    [""],
    ["1. DAFTAR KOLOM"],
  ]);

  XLSX.utils.sheet_add_json(guideIntro, COLUMN_GUIDE, {
    origin: "A6",
    skipHeader: false,
  });

  const typeStartRow = 6 + COLUMN_GUIDE.length + 3;
  XLSX.utils.sheet_add_aoa(
    guideIntro,
    [["2. JENIS SOAL (type_id) — sesuaikan dengan aplikasi"]],
    { origin: `A${typeStartRow}` },
  );
  XLSX.utils.sheet_add_json(guideIntro, QUESTION_TYPE_GUIDE, {
    origin: `A${typeStartRow + 1}`,
    skipHeader: false,
  });

  const bloomStartRow = typeStartRow + 1 + QUESTION_TYPE_GUIDE.length + 3;
  XLSX.utils.sheet_add_aoa(
    guideIntro,
    [["3. BLOOM LEVEL (opsional)"]],
    { origin: `A${bloomStartRow}` },
  );
  XLSX.utils.sheet_add_json(guideIntro, BLOOM_LEVEL_GUIDE, {
    origin: `A${bloomStartRow + 1}`,
    skipHeader: false,
  });

  const notesStartRow = bloomStartRow + 1 + BLOOM_LEVEL_GUIDE.length + 3;
  XLSX.utils.sheet_add_aoa(
    guideIntro,
    [
      ["4. CATATAN PENTING"],
      [
        "- type_id wajib angka 1 sampai 6. Nilai di luar rentang akan ditolak saat import.",
      ],
      [
        "- bloom_level opsional; jika diisi harus angka 1 sampai 6 (C1–C6).",
      ],
      ["- question_text wajib diisi pada setiap baris."],
      [
        "- Untuk PG Multi (type_id 2), key boleh berisi beberapa huruf, contoh: A,C,E.",
      ],
      [
        "- Untuk Isian Singkat (type_id 4), pisahkan variasi jawaban dengan koma.",
      ],
      [
        "- Untuk Benar/Salah (type_id 5), key harus tepat 'Benar' atau 'Salah'.",
      ],
      [
        "- Untuk Menjodohkan (type_id 6), setiap option wajib format: Kiri | Kanan.",
      ],
      [
        "- Sheet Panduan ini hanya petunjuk; data soal diisi di sheet Template Soal.",
      ],
    ],
    { origin: `A${notesStartRow}` },
  );

  // Sheet data ditaruh pertama agar kompatibel dengan pembaca yang ambil SheetNames[0]
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_QUESTIONS);
  setColumnWidths(worksheet, [10, 12, 55, 12, 28, 28, 28, 28, 28, 18]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");

  setColumnWidths(guideIntro, [14, 28, 55, 45, 55]);
  XLSX.utils.book_append_sheet(workbook, guideIntro, "Panduan");

  XLSX.writeFile(workbook, "Template_Soal_CBT.xlsx");
};
