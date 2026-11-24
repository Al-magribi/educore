// Milik feature/finance. Tambahkan preload halaman keuangan di sini, bukan di AppLayout.
const financePreloads = {
  "/finance-dashboard": () =>
    import("../../../module/finance/dashboard/FinanceDash"),
};

export default financePreloads;
