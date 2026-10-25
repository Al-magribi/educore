const QUESTION_TYPE_GUIDE = [
  {
    type_id: 1,
    jenis: "PG Jawaban Tunggal",
    kolom_wajib: "question_text, option_a..option_e, key",
    cara_isi_key: "Satu huruf jawaban benar, contoh: A",
    catatan: "Isi opsi yang dipakai saja. Opsi kosong diabaikan. Boleh berdiri sendiri atau masuk grup.",
  },
  {
    type_id: 2,
    jenis: "PG Multi Jawaban",
    kolom_wajib: "question_text, option_a..option_e, key",
    cara_isi_key: "Beberapa huruf dipisah koma, contoh: A,C",
    catatan: "Semua huruf di key harus cocok dengan opsi yang diisi.",
  },
  {
    type_id: 3,
    jenis: "Uraian",
    kolom_wajib: "question_text, score_point",
    cara_isi_key: "Kosongkan (tidak dipakai)",
    catatan: "Kosongkan option_a sampai option_e dan key. Rubrik diisi lewat form soal, bukan Excel.",
  },
  {
    type_id: 4,
    jenis: "Isian Singkat",
    kolom_wajib: "question_text, key",
    cara_isi_key: "Variasi jawaban dipisah koma, contoh: pasar, Pasar",
    catatan: "Kosongkan option_a sampai option_e. Perbedaan huruf besar tetap dihitung sebagai jawaban benar.",
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
    kolom: "group_code",
    wajib: "Hanya untuk grup",
    keterangan:
      "Kode penghubung soal yang berbagi satu bacaan. Kosongkan untuk soal mandiri. Contoh: CERPEN atau SAINS. Soal berkode sama harus ditulis berurutan.",
  },
  {
    kolom: "group_title",
    wajib: "Tidak",
    keterangan:
      "Judul bacaan, contoh: Bacaan Cerpen. Isi di baris pertama grup. Baris berikutnya dalam grup yang sama dikosongkan.",
  },
  {
    kolom: "stimulus",
    wajib: "Ya, untuk grup",
    keterangan:
      "Teks bacaan yang dipakai bersama. Isi di baris pertama grup saja. Jangan diulang di question_text.",
  },
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
    keterangan: "Pertanyaan soal ini saja, bukan ulang bacaan",
  },
  {
    kolom: "score_point",
    wajib: "Tidak",
    keterangan: "Bobot skor soal ini. Default 1 jika dikosongkan",
  },
  {
    kolom: "option_a … option_e",
    wajib: "Sesuai tipe",
    keterangan: "Opsi jawaban. Untuk menjodohkan: Kiri | Kanan",
  },
  {
    kolom: "key",
    wajib: "Sesuai tipe",
    keterangan: "Kunci jawaban soal ini. Lihat panduan per type_id",
  },
];

const GROUP_GUIDE = [
  {
    pola: "Soal mandiri",
    group_code: "(kosong)",
    cara_isi:
      "Satu baris = satu soal. group_title dan stimulus dikosongkan. Contoh di template: ibu kota, bilangan genap, 7 + 5, dan uraian.",
  },
  {
    pola: "Grup bacaan campur",
    group_code: "CERPEN",
    cara_isi:
      "Minimal 2 baris berurutan dengan kode yang sama. Baris pertama mengisi group_title dan stimulus. Contoh: PG, lalu Benar/Salah, lalu Isian Singkat tentang bacaan yang sama.",
  },
  {
    pola: "Grup dengan menjodohkan",
    group_code: "SAINS",
    cara_isi:
      "Jenis soal dalam satu grup boleh berbeda. Contoh: baris menjodohkan (option berisi Kiri | Kanan), lalu baris PG yang bertanya dari bacaan yang sama.",
  },
];

const CERPEN_STIMULUS =
  "Di pagi yang gerimis, Raka berjalan menuju pasar. Ia merasa bingung karena payungnya tertinggal di rumah. Hujan turun seharian penuh, namun Raka tetap pergi agar bisa membeli sayuran untuk ibunya.";

const SAINS_STIMULUS =
  "Tumbuhan hijau membuat makanan melalui fotosintesis. Proses ini membutuhkan cahaya matahari, air, dan karbon dioksida. Tanpa cahaya, tumbuhan tidak dapat menghasilkan glukosa secara optimal.";

const emptyOptions = {
  option_a: "",
  option_b: "",
  option_c: "",
  option_d: "",
  option_e: "",
};

export const SAMPLE_QUESTIONS = [
  {
    group_code: "",
    group_title: "",
    stimulus: "",
    type_id: 1,
    bloom_level: 2,
    question_text: "Soal mandiri 1. Ibu kota Indonesia adalah …",
    score_point: 10,
    option_a: "Jakarta",
    option_b: "Bandung",
    option_c: "Surabaya",
    option_d: "Medan",
    option_e: "",
    key: "A",
  },
  {
    group_code: "CERPEN",
    group_title: "Bacaan Cerpen",
    stimulus: CERPEN_STIMULUS,
    type_id: 1,
    bloom_level: 2,
    question_text: "Berdasarkan bacaan, tokoh utama merasa …",
    score_point: 15,
    option_a: "Senang",
    option_b: "Bingung",
    option_c: "Marah",
    option_d: "Lapar",
    option_e: "",
    key: "B",
  },
  {
    group_code: "CERPEN",
    group_title: "",
    stimulus: "",
    type_id: 5,
    bloom_level: 2,
    question_text: "Menurut bacaan, hujan turun seharian penuh.",
    score_point: 10,
    ...emptyOptions,
    key: "Benar",
  },
  {
    group_code: "CERPEN",
    group_title: "",
    stimulus: "",
    type_id: 4,
    bloom_level: 2,
    question_text: "Sebutkan tempat yang dilalui tokoh utama (satu kata).",
    score_point: 15,
    ...emptyOptions,
    key: "pasar, Pasar",
  },
  {
    group_code: "",
    group_title: "",
    stimulus: "",
    type_id: 2,
    bloom_level: 2,
    question_text: "Soal mandiri 2. Pilih bilangan genap.",
    score_point: 10,
    option_a: "2",
    option_b: "3",
    option_c: "4",
    option_d: "5",
    option_e: "",
    key: "A,C",
  },
  {
    group_code: "SAINS",
    group_title: "Bacaan Sains",
    stimulus: SAINS_STIMULUS,
    type_id: 6,
    bloom_level: 2,
    question_text: "Jodohkan ibu kota dengan negara.",
    score_point: 20,
    option_a: "Indonesia | Jakarta",
    option_b: "Malaysia | Kuala Lumpur",
    option_c: "Jepang | Tokyo",
    option_d: "",
    option_e: "",
    key: "",
  },
  {
    group_code: "SAINS",
    group_title: "",
    stimulus: "",
    type_id: 1,
    bloom_level: 2,
    question_text: "Dari bacaan sains, fotosintesis membutuhkan …",
    score_point: 10,
    option_a: "Cahaya matahari",
    option_b: "Gelap gulita",
    option_c: "Es batu",
    option_d: "Garam dapur",
    option_e: "",
    key: "A",
  },
  {
    group_code: "",
    group_title: "",
    stimulus: "",
    type_id: 1,
    bloom_level: 2,
    question_text: "Soal mandiri 3. Hasil 7 + 5 adalah …",
    score_point: 10,
    option_a: "10",
    option_b: "11",
    option_c: "12",
    option_d: "13",
    option_e: "",
    key: "C",
  },
  {
    group_code: "",
    group_title: "",
    stimulus: "",
    type_id: 3,
    bloom_level: 4,
    question_text:
      "Jelaskan perbedaan antara simbiosis mutualisme dan parasitisme, lalu berikan masing-masing satu contoh.",
    score_point: 10,
    ...emptyOptions,
    key: "",
  },
];

const setColumnWidths = (worksheet, widths) => {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
};

const getRowValue = (row, keys = []) => {
  const entries = Object.entries(row || {});
  for (const key of keys) {
    const match = entries.find(
      ([rowKey]) => String(rowKey).trim().toLowerCase() === key.toLowerCase(),
    );
    if (!match) continue;
    const value = match[1];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return undefined;
};

const parseInteger = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeBloomLevel = (value) => {
  const parsed = parseInteger(value);
  if (!parsed || parsed < 1 || parsed > 6) {
    return null;
  }
  return parsed;
};

const parseAnswerLetters = (answerKey) =>
  String(answerKey || "")
    .toUpperCase()
    .split(/[,;|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

export const isBlankImportRow = (row = {}) =>
  !Object.entries(row).some(([key, value]) => {
    if (key === "__row") return false;
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

const rowLabel = (row, index) => row?.__row || index + 2;

const readGroupFields = (row) => {
  const code = String(
    getRowValue(row, ["group_code", "kode_grup", "kode grup", "grup"]) || "",
  ).trim();
  const title = String(
    getRowValue(row, ["group_title", "judul_grup", "judul grup", "judul_bacaan"]) ||
      "",
  ).trim();
  const stimulus = String(
    getRowValue(row, ["stimulus", "bacaan", "wacana"]) || "",
  ).trim();
  return { code, title, stimulus };
};

const buildQuestionFromRow = (row, index) => {
  const rowNumber = rowLabel(row, index);
  const q_type = parseInteger(getRowValue(row, ["type_id", "Jenis", "jenis"]));
  const content = getRowValue(row, ["question_text", "Pertanyaan", "pertanyaan"]);
  const scorePoint =
    parseInteger(getRowValue(row, ["score_point", "Poin", "poin"])) || 1;
  const answerKey = getRowValue(row, ["key", "Jawaban", "jawaban"]);
  const bloomLevel = normalizeBloomLevel(
    getRowValue(row, [
      "bloom_level",
      "Bloom Level",
      "BLOOM_LEVEL",
      "Bloom",
      "bloom",
    ]),
  );
  const group = readGroupFields(row);

  if (!q_type || q_type < 1 || q_type > 6) {
    throw new Error(
      `Tipe soal tidak valid pada baris ${rowNumber}. Gunakan angka 1 sampai 6.`,
    );
  }

  if (!content) {
    throw new Error(`Pertanyaan wajib diisi pada baris ${rowNumber}.`);
  }

  if (!group.code && (group.title || group.stimulus)) {
    throw new Error(
      `Baris ${rowNumber} mengisi bacaan tanpa group_code. Isi group_code untuk soal grup, atau kosongkan group_title dan stimulus untuk soal mandiri.`,
    );
  }

  let options = [];
  const correctLetters = parseAnswerLetters(answerKey);

  if ([1, 2].includes(q_type)) {
    ["a", "b", "c", "d", "e"].forEach((letter) => {
      const optionValue = getRowValue(row, [
        `option_${letter}`,
        letter.toUpperCase(),
        letter,
      ]);
      if (optionValue) {
        options.push({
          label: letter.toUpperCase(),
          content: String(optionValue),
          is_correct: correctLetters.includes(letter.toUpperCase()),
        });
      }
    });

    if (options.length < 2) {
      throw new Error(
        `Soal PG pada baris ${rowNumber} minimal punya 2 opsi (option_a, option_b, ...).`,
      );
    }
    if (!options.some((opt) => opt.is_correct)) {
      throw new Error(
        `Kunci jawaban PG tidak valid pada baris ${rowNumber}. Isi kolom key dengan huruf opsi, contoh: A atau A,C.`,
      );
    }
  } else if (q_type === 4) {
    options = String(answerKey || "")
      .split(",")
      .map((value) => ({
        content: value.trim(),
        is_correct: true,
      }))
      .filter((item) => item.content);

    if (options.length === 0) {
      throw new Error(
        `Isian singkat pada baris ${rowNumber} wajib mengisi kolom key, contoh: pasar, Pasar.`,
      );
    }
  } else if (q_type === 5) {
    const normalizedKey = String(answerKey || "")
      .trim()
      .toLowerCase();
    if (!["benar", "salah"].includes(normalizedKey)) {
      throw new Error(
        `Benar/Salah pada baris ${rowNumber} wajib mengisi key dengan Benar atau Salah.`,
      );
    }
    options = [
      { content: "Benar", is_correct: normalizedKey === "benar" },
      { content: "Salah", is_correct: normalizedKey === "salah" },
    ];
  } else if (q_type === 6) {
    ["a", "b", "c", "d", "e"].forEach((letter) => {
      const value = getRowValue(row, [`option_${letter}`, letter.toUpperCase(), letter]);
      if (value && String(value).includes("|")) {
        const [left, right] = String(value)
          .split("|")
          .map((part) => part.trim());
        if (left && right) {
          options.push({
            label: left,
            content: right,
            is_correct: true,
          });
        }
      }
    });

    if (options.length === 0) {
      throw new Error(
        `Menjodohkan pada baris ${rowNumber} wajib format option: Sisi Kiri | Sisi Kanan.`,
      );
    }
  }

  return {
    q_type,
    bloom_level: bloomLevel,
    content: String(content),
    score_point: scorePoint,
    options,
    group_code: group.code || null,
    group_title: group.title || null,
    stimulus: group.stimulus || null,
    __row: rowNumber,
  };
};

export const parseQuestionImportRows = (rows = []) => {
  const questions = rows
    .filter((row) => !isBlankImportRow(row))
    .map((row, index) => buildQuestionFromRow(row, index));

  if (questions.length === 0) {
    throw new Error("File Excel kosong atau sheet Template Soal tidak ditemukan.");
  }

  const groups = [];
  let current = null;
  const seenCodes = new Set();

  questions.forEach((question) => {
    const normalizedCode = String(question.group_code || "").toLowerCase();
    if (!normalizedCode) {
      current = null;
      question.group_order = null;
      return;
    }

    if (!current || current.normalizedCode !== normalizedCode) {
      if (seenCodes.has(normalizedCode)) {
        throw new Error(
          `Kode grup "${question.group_code}" terputus pada baris ${question.__row}. Soal dalam satu grup harus ditulis berurutan tanpa diselingi soal lain.`,
        );
      }
      seenCodes.add(normalizedCode);
      current = {
        code: question.group_code,
        normalizedCode,
        title: question.group_title,
        stimulus: question.stimulus || "",
        count: 0,
        startRow: question.__row,
      };
      groups.push(current);
    } else if (
      question.stimulus &&
      current.stimulus &&
      question.stimulus !== current.stimulus
    ) {
      throw new Error(
        `Teks bacaan grup "${current.code}" pada baris ${question.__row} berbeda dari baris ${current.startRow}. Isi stimulus hanya di baris pertama grup.`,
      );
    } else {
      if (!current.stimulus && question.stimulus) {
        current.stimulus = question.stimulus;
      }
      if (!current.title && question.group_title) {
        current.title = question.group_title;
      }
    }

    current.count += 1;
    question.group_order = current.count;
    question.group_title = current.title;
    question.stimulus = current.stimulus;
  });

  groups.forEach((group) => {
    if (group.count < 2) {
      throw new Error(
        `Grup "${group.code}" pada baris ${group.startRow} hanya berisi 1 soal. Satu grup minimal 2 soal, atau kosongkan group_code bila soal berdiri sendiri.`,
      );
    }
    if (!String(group.stimulus || "").trim()) {
      throw new Error(
        `Grup "${group.code}" pada baris ${group.startRow} wajib mengisi kolom stimulus (teks bacaan) di baris pertama.`,
      );
    }
    if (group.title && group.title.length > 255) {
      throw new Error(
        `Judul grup "${group.code}" pada baris ${group.startRow} maksimal 255 karakter.`,
      );
    }
  });

  return questions.map(({ __row, ...question }) => question);
};

const appendSection = (worksheet, XLSX, title, rows, startRow) => {
  XLSX.utils.sheet_add_aoa(worksheet, [[title]], { origin: `A${startRow}` });
  XLSX.utils.sheet_add_json(worksheet, rows, {
    origin: `A${startRow + 1}`,
    skipHeader: false,
  });
  return startRow + 1 + rows.length + 2;
};

export const downloadTemplate = async () => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const guide = XLSX.utils.aoa_to_sheet([
    ["PANDUAN IMPORT SOAL CBT"],
    [
      "Isi data hanya di sheet Template Soal. Jangan ubah nama kolom pada baris header.",
    ],
    [
      "Baris contoh boleh dihapus atau diganti. Import membaca sheet Template Soal, bukan sheet Panduan ini.",
    ],
    [
      "Grup soal artinya beberapa pertanyaan berbagi satu bacaan. Ini berbeda dari bank soal gabungan.",
    ],
    [""],
    ["1. DAFTAR KOLOM"],
  ]);

  let nextRow = appendSection(guide, XLSX, "1. DAFTAR KOLOM", COLUMN_GUIDE, 6);
  nextRow = appendSection(
    guide,
    XLSX,
    "2. JENIS SOAL (type_id)",
    QUESTION_TYPE_GUIDE,
    nextRow,
  );
  nextRow = appendSection(
    guide,
    XLSX,
    "3. GRUP SOAL (bacaan bersama)",
    GROUP_GUIDE,
    nextRow,
  );
  nextRow = appendSection(
    guide,
    XLSX,
    "4. BLOOM LEVEL (opsional)",
    BLOOM_LEVEL_GUIDE,
    nextRow,
  );

  XLSX.utils.sheet_add_aoa(
    guide,
    [
      ["5. CARA MENGISI GRUP SOAL"],
      [
        "1. Tentukan kode pada group_code, misalnya CERPEN. Kode yang sama berarti satu bacaan.",
      ],
      [
        "2. Tulis soal anggota grup secara berurutan. Jangan selingi dengan soal mandiri atau grup lain.",
      ],
      [
        "3. Pada baris pertama grup, isi group_title (judul bacaan) dan stimulus (teks bacaan lengkap).",
      ],
      [
        "4. Baris berikutnya dalam grup yang sama: ulangi group_code, kosongkan group_title dan stimulus.",
      ],
      [
        "5. Setiap baris tetap punya pertanyaan, tipe, bobot, opsi, dan kunci sendiri.",
      ],
      [
        "6. Satu grup minimal 2 soal. Jenis soal boleh dicampur: PG, multi, uraian, isian, benar/salah, dan menjodohkan.",
      ],
      [
        "7. Soal tanpa group_code adalah soal mandiri. Jangan isi stimulus pada soal mandiri.",
      ],
      [""],
      ["6. CONTOH DI SHEET TEMPLATE SOAL"],
      [
        "Baris ibu kota, bilangan genap, 7 + 5, dan uraian adalah soal mandiri (group_code kosong).",
      ],
      [
        "CERPEN berisi 3 soal: PG perasaan tokoh (kunci B), Benar/Salah hujan (kunci Benar), dan isian tempat (kunci: pasar, Pasar).",
      ],
      [
        "SAINS berisi 2 soal: menjodohkan ibu kota (format Kiri | Kanan, key dikosongkan) lalu PG fotosintesis (kunci A).",
      ],
      [
        "Stimulus cerpen dan sains hanya ditulis sekali, di baris pertama masing-masing grup.",
      ],
      [""],
      ["7. CATATAN PENTING"],
      ["- Jangan mengubah nama header dan jangan menghapus sheet Template Soal."],
      ["- Jangan menyisipkan baris kosong di antara soal."],
      ["- type_id wajib angka 1 sampai 6."],
      ["- bloom_level opsional; jika diisi harus angka 1 sampai 6."],
      ["- question_text wajib pada setiap baris dan hanya berisi pertanyaan."],
      ["- PG multi: key boleh beberapa huruf, contoh A,C."],
      ["- Isian singkat: pisahkan variasi jawaban dengan koma."],
      ["- Benar/Salah: key harus tepat Benar atau Salah."],
      ["- Menjodohkan: setiap option wajib format Kiri | Kanan, key dikosongkan."],
      [
        "- Jika kode grup yang sama muncul lagi setelah diselingi soal lain, import ditolak.",
      ],
    ],
    { origin: `A${nextRow}` },
  );

  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_QUESTIONS);
  worksheet["!views"] = [{ state: "frozen", ySplit: 1 }];
  setColumnWidths(worksheet, [14, 18, 62, 10, 12, 62, 12, 28, 28, 28, 28, 18, 18]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");

  guide["!views"] = [{ state: "frozen", ySplit: 1 }];
  setColumnWidths(guide, [28, 24, 42, 36, 78]);
  XLSX.utils.book_append_sheet(workbook, guide, "Panduan");

  XLSX.writeFile(workbook, "Template_Soal_CBT.xlsx");
};
