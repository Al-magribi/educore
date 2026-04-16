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
const Saving = lazy(() => import("../../module/finance/teacher/saving/Saving"));
const Contribution = lazy(
  () => import("../../module/finance/teacher/contribution/Contribution"),
);
const StudentSaving = lazy(
  () => import("../../module/finance/student/saving/StudentSaving"),
);
const StudentContribution = lazy(
  () => import("../../module/finance/student/contribution/StudentContribution"),
);
const Setting = lazy(() => import("../../module/finance/setting/Setting"));

const renderFinanceRoutes = ({ LazyPage }) => {
  const Page = LazyPage;

  return (
    <>
    <Route
      element={
        <RouteProtection
          allowedRoles={["admin"]}
          allowedLevels={["finance", "keuangan"]}
        />
      }
    >
      <Route
        path="/finance-dashboard"
        element={<Page title="Dashboard Keuangan" Component={FinanceDash} />}
      />
      <Route
        path="/finance/pembayaran-spp"
        element={<Page title="Pembayaran SPP" Component={Monthly} />}
      />
      <Route
        path="/finance/pembayaran-spp/laporan"
        element={
          <Page title="Laporan Pembayaran SPP" Component={MonthlyReport} />
        }
      />
      <Route
        path="/finance/pembayaran-lainnya"
        element={<Page title="Pembayaran Lainnya" Component={Others} />}
      />
      <Route
        path="/finance/transaksi"
        element={<Page title="Transaksi Keuangan" Component={Transaction} />}
      />
      <Route
        path="/finance/laporan-tabungan"
        element={<Page title="Tabungan Siswa" Component={Saving} />}
      />
      <Route
        path="/finance/pengaturan"
        element={<Page title="Pengaturan" Component={Setting} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path="/guru/keuangan-kelas"
        element={<Page title="Kas Kelas" Component={Contribution} />}
      />
      <Route
        path="/guru/tabungan"
        element={<Page title="Tabungan Siswa" Component={Saving} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path="/siswa/laporan-tabungan"
        element={<Page title="Tabungan Saya" Component={StudentSaving} />}
      />
      <Route
        path="/siswa/laporan-uang-kas"
        element={
          <Page
            title="Laporan Uang Kas"
            Component={StudentContribution}
          />
        }
      />
    </Route>
    </>
  );
};

export default renderFinanceRoutes;
