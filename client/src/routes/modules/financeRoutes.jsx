import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const FinanceDash = lazy(
  () => import("../../module/finance/dashboard/FinanceDash"),
);
const Monthly = lazy(() => import("../../module/finance/fee/monthly/Monthly"));
const MonthlyReport = lazy(
  () => import("../../module/finance/fee/monthly/Report"),
);
const Others = lazy(() => import("../../module/finance/fee/others/Others"));
const Transaction = lazy(
  () => import("../../module/finance/fee/transaction/Transaction"),
);
const CashReport = lazy(
  () => import("../../module/finance/report/CashReport"),
);
const SavingReport = lazy(
  () => import("../../module/finance/report/SavingReport"),
);

const renderFinanceRoutes = ({ LazyPage }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin"]}
        allowedLevels={["keuangan"]}
      />
    }
  >
    <Route
      path='/finance-dashboard'
      element={<LazyPage title='Dashboard Keuangan' Component={FinanceDash} />}
    />
    <Route
      path='/finance/pembayaran-spp'
      element={<LazyPage title='Pembayaran SPP' Component={Monthly} />}
    />
    <Route
      path='/finance/pembayaran-spp/laporan'
      element={<LazyPage title='Laporan Pembayaran SPP' Component={MonthlyReport} />}
    />
    <Route
      path='/finance/pembayaran-lainnya'
      element={<LazyPage title='Pembayaran Lainnya' Component={Others} />}
    />
    <Route
      path='/finance/transaksi'
      element={<LazyPage title='Transaksi Keuangan' Component={Transaction} />}
    />
    <Route
      path='/finance/laporan-tabungan'
      element={<LazyPage title='Laporan Tabungan' Component={SavingReport} />}
    />
    <Route
      path='/finance/laporan-kas-kelas'
      element={<LazyPage title='Laporan Kas Kelas' Component={CashReport} />}
    />
  </Route>
);

export default renderFinanceRoutes;
