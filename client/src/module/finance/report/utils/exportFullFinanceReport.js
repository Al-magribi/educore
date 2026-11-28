import * as XLSX from "xlsx";

import { currencyFormatter } from "../constants";

const money = (value) => currencyFormatter.format(Number(value || 0));

const filterLabel = (filter = {}, periodeName = "-") => {
  if (filter.mode === "bulan") {
    return `${periodeName} · Bulan ${filter.month_label || filter.month || "-"}`;
  }
  if (filter.mode === "rentang") {
    return `${periodeName} · ${filter.date_from || "-"} s/d ${filter.date_to || "-"}`;
  }
  return `${periodeName} · Satu periode utuh`;
};

const autoCols = (rows, min = 12) => {
  if (!rows.length) return [];
  return rows[0].map((_, colIndex) => {
    let width = min;
    for (const row of rows) {
      width = Math.max(width, String(row[colIndex] ?? "").length + 2);
    }
    return { wch: Math.min(width, 42) };
  });
};

const appendSheet = (workbook, name, rows) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = autoCols(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
};

/**
 * Ekspor laporan keuangan lengkap ke Excel multi-sheet.
 */
export const exportFullFinanceReportExcel = (report, options = {}) => {
  if (!report) {
    throw new Error("Data laporan tidak tersedia");
  }

  const homebaseName =
    options.homebaseName || report.homebase?.name || "Satuan Pendidikan";
  const periodeName = report.periode?.name || "-";
  const summary = report.summary || {};
  const budgetItems = report.budget_realization?.items || [];
  const cashflow = report.monthly_cashflow || [];
  const printedAt = new Date().toLocaleString("id-ID");

  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, "Ringkasan", [
    ["LAPORAN KEUANGAN SEKOLAH"],
    ["Satuan", homebaseName],
    ["Periode / Filter", filterLabel(report.filter, periodeName)],
    ["Dicetak", printedAt],
    [],
    ["Uraian", "Nilai"],
    ["Realisasi SPP", money(summary.spp_collected)],
    ["Realisasi Lainnya", money(summary.other_collected)],
    ["Total Pendapatan Fee", money(summary.fee_income_total)],
    ["Target Netto", money(summary.fee_target_total)],
    ["Sisa Tagihan", money(summary.fee_remaining_total)],
    ["Siswa Belum Lunas", summary.unpaid_student_count || 0],
    ["Pengeluaran Operasional", money(summary.expense_total)],
    ["Honorarium Terkunci", money(summary.honorarium_total)],
    ["Honorarium Draft (Komitmen)", money(summary.honorarium_draft_total)],
    ["Total Pengeluaran", money(summary.expense_grand_total)],
    ["Saldo Bersih", money(summary.net_balance)],
  ]);

  appendSheet(workbook, "SPP per Kelas", [
    [
      "Kelas",
      "Jenjang",
      "Siswa",
      "Target",
      "Tertagih",
      "Sisa",
      "Pencapaian %",
      "Lunas",
      "Cicilan",
      "Belum",
    ],
    ...(report.spp_by_class || []).map((row) => [
      row.class_name,
      row.grade_name,
      row.student_count,
      money(row.target),
      money(row.paid_obligation),
      money(row.remaining),
      row.achievement,
      row.paid_count,
      row.partial_count,
      row.unpaid_count,
    ]),
  ]);

  appendSheet(workbook, "Lainnya per Tipe", [
    [
      "Jenis Biaya",
      "Siswa",
      "Target",
      "Tertagih",
      "Sisa",
      "Pencapaian %",
      "Lunas",
      "Cicilan",
      "Belum",
    ],
    ...(report.other_by_type || []).map((row) => [
      row.type_name,
      row.student_count,
      money(row.target),
      money(row.paid_obligation),
      money(row.remaining),
      row.achievement,
      row.paid_count,
      row.partial_count,
      row.unpaid_count,
    ]),
  ]);

  appendSheet(workbook, "RAPBS", [
    ["Jenis", "Uraian", "Anggaran", "Realisasi", "Selisih", "Capaian %"],
    ...budgetItems.map((row) => [
      row.kind === "income" ? "Pendapatan" : "Pengeluaran",
      row.label,
      money(row.budget_amount),
      money(row.realized_amount),
      money(row.variance),
      row.percent ?? "-",
    ]),
  ]);

  appendSheet(workbook, "Arus Kas", [
    ["Bulan", "Kas Masuk", "Kas Keluar", "Netto", "Saldo Berjalan"],
    ...cashflow.map((row) => [
      row.month_label,
      money(row.cash_in),
      money(row.cash_out),
      money(row.net),
      money(row.running_balance),
    ]),
  ]);

  appendSheet(workbook, "Tanda Tangan", [
    ["Dokumen ini dicetak dari sistem Educore."],
    ["Tanggal cetak", printedAt],
    [],
    ["Mengetahui,", "", "Dibuat oleh,"],
    ["Kepala Sekolah / Yayasan", "", "Bendahara"],
    [],
    [],
    ["(..............................)", "", "(..............................)"],
    ["NIP / NIK", "", "NIP / NIK"],
  ]);

  const safeName = String(homebaseName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  XLSX.writeFile(
    workbook,
    `laporan-keuangan-${safeName || "sekolah"}-${Date.now()}.xlsx`,
  );
};

/**
 * Cetak laporan resmi (browser → Save as PDF).
 */
export const printFullFinanceReport = (report, options = {}) => {
  if (!report) {
    throw new Error("Data laporan tidak tersedia");
  }

  const homebaseName =
    options.homebaseName || report.homebase?.name || "Satuan Pendidikan";
  const periodeName = report.periode?.name || "-";
  const summary = report.summary || {};
  const budgetItems = report.budget_realization?.items || [];
  const cashflow = report.monthly_cashflow || [];
  const printedAt = new Date().toLocaleString("id-ID");

  const rowHtml = (cells) =>
    `<tr>${cells.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`;

  const table = (headers, bodyRows) => `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${bodyRows.map((cells) => rowHtml(cells)).join("")}</tbody>
    </table>
  `;

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>Laporan Keuangan — ${homebaseName}</title>
  <style>
    @page { margin: 18mm 14mm; }
    body { font-family: "Segoe UI", Tahoma, sans-serif; color: #0f172a; font-size: 12px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 22px 0 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    .meta { color: #475569; margin-bottom: 16px; }
    .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0 18px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
    .card .label { color: #64748b; font-size: 11px; }
    .card .value { font-weight: 700; font-size: 14px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background: #f1f5f9; }
    td.num, th.num { text-align: right; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-top: 48px; }
    .sign .box { text-align: center; }
    .sign .space { height: 64px; }
    .muted { color: #64748b; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()" style="margin-bottom:12px;padding:8px 12px;">Cetak / Simpan PDF</button>
  <h1>Laporan Keuangan Sekolah</h1>
  <div class="meta">
    <div><strong>${homebaseName}</strong></div>
    <div>${filterLabel(report.filter, periodeName)}</div>
    <div class="muted">Dicetak: ${printedAt}</div>
  </div>

  <div class="cards">
    <div class="card"><div class="label">Total Pendapatan Fee</div><div class="value">${money(summary.fee_income_total)}</div></div>
    <div class="card"><div class="label">Total Pengeluaran</div><div class="value">${money(summary.expense_grand_total)}</div></div>
    <div class="card"><div class="label">Saldo Bersih</div><div class="value">${money(summary.net_balance)}</div></div>
    <div class="card"><div class="label">Pengeluaran Operasional</div><div class="value">${money(summary.expense_total)}</div></div>
    <div class="card"><div class="label">Honorarium Terkunci</div><div class="value">${money(summary.honorarium_total)}</div></div>
    <div class="card"><div class="label">Honorarium Draft (Komitmen)</div><div class="value">${money(summary.honorarium_draft_total)}</div></div>
  </div>

  <h2>Realisasi Anggaran (RAPBS)</h2>
  ${table(
    ["Jenis", "Uraian", "Anggaran", "Realisasi", "Selisih", "Capaian"],
    budgetItems.map((row) => [
      row.kind === "income" ? "Pendapatan" : "Pengeluaran",
      row.label,
      money(row.budget_amount),
      money(row.realized_amount),
      money(row.variance),
      row.percent == null ? "-" : `${row.percent}%`,
    ]),
  )}

  <h2>Arus Kas Bulanan</h2>
  ${table(
    ["Bulan", "Kas Masuk", "Kas Keluar", "Netto", "Saldo Berjalan"],
    cashflow.map((row) => [
      row.month_label,
      money(row.cash_in),
      money(row.cash_out),
      money(row.net),
      money(row.running_balance),
    ]),
  )}

  <div class="sign">
    <div class="box">
      <div>Mengetahui,</div>
      <div>Kepala Sekolah / Yayasan</div>
      <div class="space"></div>
      <div>(........................................)</div>
      <div class="muted">NIP / NIK</div>
    </div>
    <div class="box">
      <div>Dibuat oleh,</div>
      <div>Bendahara</div>
      <div class="space"></div>
      <div>(........................................)</div>
      <div class="muted">NIP / NIK</div>
    </div>
  </div>
</body>
</html>`;

  const popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!popup) {
    throw new Error("Popup diblokir. Izinkan popup untuk mencetak laporan.");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
};
