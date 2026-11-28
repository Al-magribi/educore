import { shownValue } from "./profileDefaults";

const text = (value) => (value === null || value === undefined || value === "" ? "-" : String(value));

const line = (label, value) =>
  `<tr><th>${label}</th><td>${text(value)}</td></tr>`;

const personBlock = (title, person = {}) => `
  <h3>${title}</h3>
  <table class="plain">
    ${line("Nama", person.name)}
    ${line("Tempat, tanggal lahir", [person.birth_place, person.birth_date].filter(Boolean).join(", "))}
    ${line("Agama", person.religion)}
    ${line("Kewarganegaraan", person.citizenship)}
    ${line("Pendidikan terakhir", person.education)}
    ${line("Pekerjaan", person.job)}
    ${line("Penghasilan", person.income)}
    ${line("Alamat", [person.address?.street, person.address?.village, person.address?.district, person.address?.regency, person.address?.province].filter(Boolean).join(", "))}
    ${line("Telepon", person.phone || person.address?.phone)}
  </table>
`;

const semesterLabel = (semester) => (Number(semester) === 3 ? "US" : `Semester ${semester}`);

export const buildBukuHtml = (bundle) => {
  const profile = bundle?.buku?.profile || {};
  const student = bundle?.student || {};
  const scores = bundle?.scores || [];
  const subjects = [];
  const periods = [];
  scores
    .filter((row) => row.kind !== "ekskul")
    .forEach((row) => {
      const key = `${row.periode_id || 0}-${row.semester}`;
      if (!periods.some((item) => item.key === key)) {
        periods.push({
          key,
          label: `${row.periode_name || "Periode"} / ${semesterLabel(row.semester)}`,
        });
      }
      if (!subjects.includes(row.subject_name)) subjects.push(row.subject_name);
    });

  const cell = (subject, periodKey) => {
    const row = scores.find(
      (item) =>
        item.subject_name === subject &&
        `${item.periode_id || 0}-${item.semester}` === periodKey &&
        item.kind !== "ekskul",
    );
    if (!row) return "<td></td><td></td>";
    return `<td>${text(shownValue(row.score_override, row.score_lms))}</td><td>${text(shownValue(row.predicate_override, row.predicate_lms))}</td>`;
  };

  const header = periods
    .map((period) => `<th colspan="2">${period.label}</th>`)
    .join("");
  const subHeader = periods.map(() => "<th>N</th><th>P</th>").join("");
  const body = subjects
    .map(
      (subject, index) =>
        `<tr><td>${index + 1}</td><td>${subject}</td>${periods
          .map((period) => cell(subject, period.key))
          .join("")}</tr>`,
    )
    .join("");

  const ekskul = scores
    .filter((row) => row.kind === "ekskul")
    .map(
      (row) =>
        `<tr><td>${text(row.subject_name)}</td><td>${text(row.periode_name)}</td><td>${text(shownValue(row.score_override, row.score_lms))}</td></tr>`,
    )
    .join("");

  const attendance = (bundle?.attendance || [])
    .map(
      (row) =>
        `<tr><td>${text(row.periode_name)}</td><td>${row.semester}</td><td>${text(shownValue(row.sick_override, row.sick_lms))}</td><td>${text(shownValue(row.permit_override, row.permit_lms))}</td><td>${text(shownValue(row.absent_override, row.absent_lms))}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
  <html lang="id">
  <head>
    <meta charset="utf-8" />
    <title>Buku Induk ${text(student.full_name)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      body { font-family: "Times New Roman", serif; color: #111; font-size: 12px; }
      h1 { font-size: 16px; text-align: center; margin: 0 0 4px; }
      h2 { font-size: 13px; margin: 14px 0 6px; }
      h3 { font-size: 12px; margin: 10px 0 4px; }
      .sheet { page-break-after: always; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
      .plain th { width: 34%; text-align: left; font-weight: 600; padding: 2px 6px 2px 0; vertical-align: top; }
      .grid th, .grid td { border: 1px solid #222; padding: 3px 4px; font-size: 10px; }
      .muted { text-align: center; margin-bottom: 8px; }
    </style>
  </head>
  <body>
    <section class="sheet">
      <h1>LEMBAR BUKU INDUK REGISTER</h1>
      <p class="muted">${text(bundle?.homebase_name)}<br/>NIS/NISN: ${text(student.nis)} / ${text(student.nisn)}</p>
      <h2>A. Keterangan peserta didik</h2>
      <table class="plain">
        ${line("Nama lengkap", student.full_name)}
        ${line("Nama panggilan", profile.nickname)}
        ${line("Jenis kelamin", student.gender)}
        ${line("Tempat, tanggal lahir", [profile.birth_place, profile.birth_date].filter(Boolean).join(", "))}
        ${line("Agama", profile.religion)}
        ${line("Kewarganegaraan", profile.citizenship)}
        ${line("Anak ke", `${profile.child_order || "-"}, saudara kandung ${profile.sibling_full || "-"}, tiri ${profile.sibling_step || "-"}, angkat ${profile.sibling_adopted || "-"}`)}
        ${line("Bahasa sehari-hari", profile.daily_language)}
        ${line("Alamat", [profile.address?.street, profile.address?.district, profile.address?.regency, profile.address?.province, profile.address?.postal_code].filter(Boolean).join(", "))}
        ${line("Telepon", profile.address?.phone)}
        ${line("Tinggal bersama", profile.living_with)}
        ${line("Kelas sekarang", [student.grade_name, student.class_name].filter(Boolean).join(" "))}
      </table>
      <h2>B. Keterangan kesehatan</h2>
      <table class="plain">
        ${line("Tinggi badan", `Saat diterima ${text(profile.health?.height_entry)} cm, saat meninggalkan ${text(profile.health?.height_leave)} cm`)}
        ${line("Berat badan", `Saat diterima ${text(profile.health?.weight_entry)} kg, saat meninggalkan ${text(profile.health?.weight_leave)} kg`)}
        ${line("Media sosial", profile.health?.social_media)}
        ${line("Penyakit yang pernah diderita", profile.health?.illness)}
        ${line("Kelainan jasmani", profile.health?.physical_note)}
      </table>
      <h2>C. Keterangan pendidikan</h2>
      <table class="plain">
        ${line("Sekolah asal", profile.prior_education?.school)}
        ${line("Tanggal ijazah", profile.prior_education?.diploma_date)}
        ${line("Nomor ijazah", profile.prior_education?.diploma_no)}
        ${line("Nomor SKHUN", profile.prior_education?.skhun_no)}
        ${line("Nomor peserta ujian", profile.prior_education?.exam_no)}
        ${line("Diterima", `${profile.accepted?.date || "-"} di kelas ${profile.accepted?.class_name || "-"}`)}
        ${line("Pindahan dari", profile.transfer_in?.school)}
        ${line("Alasan pindah masuk", profile.transfer_in?.reason)}
      </table>
      ${personBlock("D. Ayah kandung", profile.father)}
      ${personBlock("E. Ibu kandung", profile.mother)}
    </section>
    <section>
      ${personBlock("F. Wali", profile.guardian)}
      <h2>G. Perkembangan peserta didik</h2>
      <table class="grid">
        <tr><th>Tahun</th><th>Beasiswa</th></tr>
        ${(profile.scholarships || []).map((item) => `<tr><td>${text(item.year_label)}</td><td>${text(item.note)}</td></tr>`).join("")}
      </table>
      <table class="plain">
        ${line("Prestasi kesenian", profile.achievements?.art)}
        ${line("Prestasi olahraga", profile.achievements?.sport)}
        ${line("Prestasi akademik", profile.achievements?.academic)}
        ${line("Prestasi lain", profile.achievements?.other)}
        ${line("Pindah sekolah", `${profile.transfer_out?.date || "-"} ${profile.transfer_out?.school || ""} ${profile.transfer_out?.reason || ""}`)}
        ${line("Akhir pendidikan", profile.graduation?.date)}
        ${line("Nomor ijazah", profile.graduation?.diploma_no)}
        ${line("Nomor peserta ujian", profile.graduation?.exam_no)}
      </table>
      <h2>H. Setelah selesai pendidikan</h2>
      <table class="plain">
        ${line("Melanjutkan ke", profile.after?.continue_to)}
        ${line("Jurusan", profile.after?.major)}
        ${line("Bekerja di", profile.after?.workplace)}
        ${line("Penghasilan", profile.after?.income)}
      </table>
      <h2>I. Hasil belajar</h2>
      <table class="grid">
        <tr><th rowspan="2">No</th><th rowspan="2">Mata pelajaran</th>${header}</tr>
        <tr>${subHeader}</tr>
        ${body || `<tr><td colspan="${2 + periods.length * 2}">Belum ada nilai.</td></tr>`}
      </table>
      <h3>Ekstrakurikuler</h3>
      <table class="grid"><tr><th>Kegiatan</th><th>Periode</th><th>Nilai</th></tr>${ekskul}</table>
      <h3>Ketidakhadiran</h3>
      <table class="grid"><tr><th>Periode</th><th>Semester</th><th>Sakit</th><th>Izin</th><th>Alpa</th></tr>${attendance}</table>
      <h3>Ketetapan</h3>
      <table class="grid"><tr><th>Periode</th><th>Ketetapan</th></tr>
        ${(bundle?.decisions || []).map((row) => `<tr><td>${text(row.year_label || row.periode_name)}</td><td>${text(row.decision)}</td></tr>`).join("")}
      </table>
    </section>
  </body></html>`;
};

export const printBukuInduk = (bundle) => {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!popup) {
    throw new Error("Jendela cetak diblokir browser.");
  }
  popup.document.open();
  popup.document.write(buildBukuHtml(bundle));
  popup.document.close();
  popup.focus();
  window.setTimeout(() => popup.print(), 300);
};

const loadPdfMaker = async () => {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const origin = window.location.origin;
  pdfMake.vfs = pdfMake.vfs || {};
  pdfMake.fonts = {
    Tinos: {
      normal: `${origin}/fonts/tinos/Tinos-Regular.ttf`,
      bold: `${origin}/fonts/tinos/Tinos-Bold.ttf`,
      italics: `${origin}/fonts/tinos/Tinos-Italic.ttf`,
      bolditalics: `${origin}/fonts/tinos/Tinos-BoldItalic.ttf`,
    },
  };
  return pdfMake;
};

const pdfLine = (label, value) => ({
  columns: [
    { text: label, width: 150, bold: true },
    { text: text(value), width: "*" },
  ],
  margin: [0, 1, 0, 1],
});

export const downloadBukuIndukPdf = async (bundle) => {
  const pdfMake = await loadPdfMaker();
  const profile = bundle?.buku?.profile || {};
  const student = bundle?.student || {};
  const scores = (bundle?.scores || []).filter((row) => row.kind !== "ekskul");
  const doc = {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Tinos", fontSize: 10 },
    content: [
      { text: "LEMBAR BUKU INDUK REGISTER", style: "title", alignment: "center" },
      {
        text: `${bundle?.homebase_name || "-"}\nNIS/NISN: ${text(student.nis)} / ${text(student.nisn)}`,
        alignment: "center",
        margin: [0, 0, 0, 8],
      },
      { text: "A. Keterangan peserta didik", style: "section" },
      pdfLine("Nama lengkap", student.full_name),
      pdfLine("Nama panggilan", profile.nickname),
      pdfLine("Tempat, tanggal lahir", [profile.birth_place, profile.birth_date].filter(Boolean).join(", ")),
      pdfLine("Agama / kewarganegaraan", [profile.religion, profile.citizenship].filter(Boolean).join(" / ")),
      pdfLine("Alamat", [profile.address?.street, profile.address?.district, profile.address?.regency].filter(Boolean).join(", ")),
      pdfLine("Tinggal bersama", profile.living_with),
      { text: "B. Kesehatan", style: "section" },
      pdfLine("Tinggi / berat saat diterima", `${text(profile.health?.height_entry)} cm / ${text(profile.health?.weight_entry)} kg`),
      pdfLine("Tinggi / berat saat pergi", `${text(profile.health?.height_leave)} cm / ${text(profile.health?.weight_leave)} kg`),
      pdfLine("Penyakit", profile.health?.illness),
      { text: "C. Pendidikan", style: "section" },
      pdfLine("Sekolah asal", profile.prior_education?.school),
      pdfLine("Ijazah asal", profile.prior_education?.diploma_no),
      pdfLine("Diterima", `${profile.accepted?.date || "-"} kelas ${profile.accepted?.class_name || "-"}`),
      { text: "D–F. Orang tua dan wali", style: "section" },
      pdfLine("Ayah", profile.father?.name),
      pdfLine("Ibu", profile.mother?.name),
      pdfLine("Wali", profile.guardian?.name),
      { text: "H. Setelah lulus", style: "section" },
      pdfLine("Melanjutkan ke", profile.after?.continue_to),
      pdfLine("Bekerja di", profile.after?.workplace),
      { text: "I. Hasil belajar", style: "section", pageBreak: "before" },
      {
        table: {
          headerRows: 1,
          widths: ["*", 70, 40, 28],
          body: [
            ["Mata pelajaran", "Periode", "Nilai", "Predikat"].map((item) => ({
              text: item,
              bold: true,
            })),
            ...(scores.length
              ? scores.map((row) => [
                  row.subject_name,
                  `${row.periode_name || "-"} / ${semesterLabel(row.semester)}`,
                  text(shownValue(row.score_override, row.score_lms)),
                  text(shownValue(row.predicate_override, row.predicate_lms)),
                ])
              : [["Belum ada nilai", "", "", ""]]),
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      title: { fontSize: 14, bold: true },
      section: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
    },
  };

  const safeName = String(student.full_name || "siswa")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .trim();
  pdfMake.createPdf(doc).download(`Buku Induk - ${safeName}.pdf`);
};
