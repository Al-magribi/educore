import { lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const FinanceDash = lazy(
  () => import("../../module/finance/dashboard/FinanceDash"),
);
const Monthly = lazy(() => import("../../module/finance/fee/monthly/Monthly"));
const Others = lazy(() => import("../../module/finance/fee/others/Others"));
const Transaction = lazy(
  () => import("../../module/finance/fee/transaction/Transaction"),
);
const SavingReport = lazy(
  () => import("../../module/finance/report/SavingReport"),
);
const CashReport = lazy(() => import("../../module/finance/report/CashReport"));
const Setting = lazy(() => import("../../module/finance/setting/Setting"));
const TeacherContribution = lazy(
  () => import("../../module/finance/teacher/contribution/Contribution"),
);
const TeacherSaving = lazy(
  () => import("../../module/finance/teacher/saving/Saving"),
);
const StudentContribution = lazy(
  () => import("../../module/finance/student/contribution/StudentContribution"),
);
const ParentPayment = lazy(
  () => import("../../module/finance/parent/transaction/ParentTransaction"),
);
const ParentSavingReport = lazy(
  () => import("../../module/finance/report/SavingReport"),
);

const renderFinanceRoutes = ({ LazyPage }) => {
  const Page = LazyPage;

  return (
    <>
      <Route
        element={
          <RouteProtection
            allowedRoles={["admin"]}
            allowedLevels={["finance", "keuangan", "satuan"]}
          />
        }
      >
        <Route
          path='/finance-dashboard'
          element={<Page title='Dashboard Keuangan' Component={FinanceDash} />}
        />
        <Route
          path='/finance/pembayaran-spp'
          element={<Page title='Pembayaran SPP' Component={Monthly} />}
        />
        <Route
          path='/finance/pembayaran-lainnya'
          element={<Page title='Pembayaran Lainnya' Component={Others} />}
        />
        <Route
          path='/finance/transaksi'
          element={<Page title='Transaksi Keuangan' Component={Transaction} />}
        />
        <Route
          path='/finance/laporan-tabungan'
          element={<Page title='Laporan Tabungan' Component={SavingReport} />}
        />
        <Route
          path='/finance/laporan-kas-kelas'
          element={<Page title='Laporan Kas Kelas' Component={CashReport} />}
        />
        <Route
          path='/finance/pengaturan'
          element={<Page title='Pengaturan Keuangan' Component={Setting} />}
        />
      </Route>

      <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
        <Route
          path='/guru/keuangan-kelas'
          element={
            <Page title='Keuangan Kelas' Component={TeacherContribution} />
          }
        />
        <Route
          path='/guru/tabungan'
          element={<Page title='Tabungan Kelas' Component={TeacherSaving} />}
        />
      </Route>

      <Route element={<RouteProtection allowedRoles={["student"]} />}>
        <Route
          path='/siswa/laporan-uang-kas'
          element={
            <Page title='Laporan Uang Kas' Component={StudentContribution} />
          }
        />
      </Route>

      <Route element={<RouteProtection allowedRoles={["parent"]} />}>
        <Route
          path='/orangtua/pembayaran'
          element={<Page title='Pembayaran' Component={ParentPayment} />}
        />
        <Route
          path='/orangtua/laporan-tabungan'
          element={
            <Page title='Laporan Tabungan' Component={ParentSavingReport} />
          }
        />
      </Route>
    </>
  );
};

export default renderFinanceRoutes;
