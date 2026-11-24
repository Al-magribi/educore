// Milik feature/finance. Tambahkan preload halaman keuangan di sini, bukan di AppLayout.
const financePreloads = {
  "/finance-dashboard": () =>
    import("../../../module/finance/dashboard/FinanceDash"),
  "/finance/pembayaran-spp": () =>
    import("../../../module/finance/fee/monthly/Monthly"),
  "/finance/pembayaran-spp/laporan": () =>
    import("../../../module/finance/fee/monthly/Report"),
  "/finance/pembayaran-lainnya": () =>
    import("../../../module/finance/fee/others/Others"),
  "/finance/beasiswa": () =>
    import("../../../module/finance/scholarship/Scholarship"),
  "/finance/transaksi": () =>
    import("../../../module/finance/fee/transaction/Transaction"),
  "/finance/pengeluaran": () =>
    import("../../../module/finance/expense/Expense"),
  "/finance/rapbs": () =>
    import("../../../module/finance/rapbs/Rapbs"),
  "/finance/laporan": () =>
    import("../../../module/finance/report/FinanceReport"),
  "/finance/laporan-tabungan": () =>
    import("../../../module/finance/report/SavingReport"),
  "/finance/laporan-kas-kelas": () =>
    import("../../../module/finance/report/CashReport"),
  "/guru/keuangan-kelas": () =>
    import("../../../module/finance/teacher/contribution/Contribution"),
  "/guru/tabungan": () =>
    import("../../../module/finance/teacher/saving/Saving"),
  "/siswa/laporan-tabungan": () =>
    import("../../../module/finance/student/saving/StudentSaving"),
  "/siswa/laporan-uang-kas": () =>
    import("../../../module/finance/student/contribution/StudentContribution"),
};

export default financePreloads;
