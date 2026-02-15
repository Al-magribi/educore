export const downloadTemplate = async () => {
  const XLSX = await import("xlsx");
  const template = [
    {
      type_id: 1,
      question_text:
        "Perhatikan ciri-ciri bangun ruang: a. Memiliki 6 sisi sama besar... Bangun tersebut adalah? [cite: 15]",
      score_point: 2,
      option_a: "Kubus",
      option_b: "Balok",
      option_c: "Limas",
      option_d: "Prisma",
      option_e: "",
      key: "A",
    },
    {
      type_id: 4,
      question_text: "Banyak titik sudut pada bola adalah... [cite: 159]",
      score_point: 5,
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      option_e: "",
      key: "0, Kosong", // Variasi jawaban isian [cite: 156]
    },
    {
      type_id: 6,
      question_text:
        "Pasangkan koordinat titik asal dengan hasil translasinya! ",
      score_point: 10,
      option_a: "A(3,-2) trans (-4,5) | (-1,3)", // Format Kiri | Kanan [cite: 141, 146]
      option_b: "B(-6,3) refl sumbu Y | (6,3)",
      option_c: "C(4,1) dilat [0,2] | (8,2)",
      option_d: "",
      option_e: "",
      key: "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");

  worksheet["!cols"] = [
    { wch: 10 },
    { wch: 50 },
    { wch: 12 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 25 },
    { wch: 20 },
  ];

  XLSX.writeFile(workbook, "Template_Soal_CBT.xlsx");
};
