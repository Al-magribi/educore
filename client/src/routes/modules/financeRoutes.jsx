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
const Saving = lazy(() => import("../../module/finance/teacher/saving/Saving"));
const Contribution = lazy(
  () => import("../../module/finance/teacher/contribution/Contribution"),
);
const StudentContribution = lazy(
  () => import("../../module/finance/student/contribution/StudentContribution"),
);

const renderFinanceRoutes = (props) => {
  const LazyPageComponent = props.LazyPage;

  return (
    <>
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
        element={
          <LazyPageComponent title='Dashboard Keuangan' Component={FinanceDash} />
        }
      />
      <Route
        path='/finance/pembayaran-spp'
        element={<LazyPageComponent title='Pembayaran SPP' Component={Monthly} />}
      />
      <Route
        path='/finance/pembayaran-spp/laporan'
        element={
          <LazyPageComponent
            title='Laporan Pembayaran SPP'
            Component={MonthlyReport}
          />
        }
      />
      <Route
        path='/finance/pembayaran-lainnya'
        element={
          <LazyPageComponent title='Pembayaran Lainnya' Component={Others} />
        }
      />
      <Route
        path='/finance/transaksi'
        element={
          <LazyPageComponent title='Transaksi Keuangan' Component={Transaction} />
        }
      />
      <Route
        path='/finance/laporan-tabungan'
        element={<LazyPageComponent title='Tabungan Siswa' Component={Saving} />}
      />
      <Route
        path='/finance/laporan-kas-kelas'
        element={
          <LazyPageComponent title='Laporan Kas Kelas' Component={CashReport} />
        }
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path='/guru/keuangan-kelas'
        element={<LazyPageComponent title='Kas Kelas' Component={Contribution} />}
      />
      <Route
        path='/guru/tabungan'
        element={<LazyPageComponent title='Tabungan Siswa' Component={Saving} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path='/siswa/laporan-uang-kas'
        element={
          <LazyPageComponent
            title='Laporan Uang Kas'
            Component={StudentContribution}
          />
        }
      />
    </Route>
    </>
  );
};

export default renderFinanceRoutes;
