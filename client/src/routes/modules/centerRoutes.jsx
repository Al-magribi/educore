import { createElement, lazy } from "react";
import { Navigate, Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const CenterDash = lazy(
  () => import("../../module/center/dashboard/CenterDash"),
);
const CenterHome = lazy(
  () => import("../../module/center/homebase/CenterHome"),
);
const CenterAdmin = lazy(() => import("../../module/center/admin/CenterAdmin"));
const CenterTeacher = lazy(
  () => import("../../module/center/teacher/CenterTeacher"),
);
const CenterMarket = lazy(
  () => import("../../module/center/market/CenterMarket"),
);
const CenterConfig = lazy(
  () => import("../../module/center/config/CenterConfig"),
);

const CenterFinanceHome = lazy(() =>
  import("../../module/center/finance/CenterFinanceHome"),
);
const CenterFinanceShell = lazy(() =>
  import("../../module/center/finance/CenterFinanceShell"),
);
const Monthly = lazy(
  () => import("../../module/finance/fee/monthly/Monthly"),
);
const Others = lazy(
  () => import("../../module/finance/fee/others/Others"),
);
const Transaction = lazy(
  () => import("../../module/finance/fee/transaction/Transaction"),
);
const Scholarship = lazy(
  () => import("../../module/finance/scholarship/Scholarship"),
);
const Expense = lazy(
  () => import("../../module/finance/expense/Expense"),
);
const SavingReport = lazy(
  () => import("../../module/finance/report/SavingReport"),
);
const FinanceReport = lazy(
  () => import("../../module/finance/report/CenterFinanceReport"),
);
const Rapbs = lazy(() => import("../../module/finance/rapbs/Rapbs"));
const Setting = lazy(
  () => import("../../module/finance/setting/Setting"),
);

const renderCenterRoutes = ({ LazyPage, NotFoundRedirect, isDbEnabled }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
    }
  >
    <Route
      path='/center-dashboard'
      element={createElement(LazyPage, {
        title: "Dashboard Center",
        Component: CenterDash,
      })}
    />
    <Route
      path='/center-homebase'
      element={createElement(LazyPage, {
        title: "Manajemen Satuan Pendidikan",
        Component: CenterHome,
      })}
    />
    <Route
      path='/center-admin'
      element={createElement(LazyPage, {
        title: "Manajemen Admin",
        Component: CenterAdmin,
      })}
    />
    <Route
      path='/center-teacher'
      element={createElement(LazyPage, {
        title: "Manajement Guru",
        Component: CenterTeacher,
      })}
    />
    <Route
      path='/center-analysis'
      element={createElement(LazyPage, {
        title: "Analisis Pasar & Demografi",
        Component: CenterMarket,
      })}
    />
    <Route
      path='/center-config'
      element={
        isDbEnabled ? (
          createElement(LazyPage, {
            title: "Manjemen Database",
            Component: CenterConfig,
          })
        ) : (
          createElement(NotFoundRedirect)
        )
      }
    />

    {/* Keuangan Pusat — list homebase */}
    <Route
      path='/keuangan'
      element={createElement(LazyPage, {
        title: "Keuangan Pusat",
        Component: CenterFinanceHome,
      })}
    />
    {/* Keuangan Pusat — per homebase, dengan nested shell + navbar */}
    <Route
      path='/keuangan/:homebaseId'
      element={<CenterFinanceShell />}
    >
      <Route index element={<Navigate to='pembayaran-spp' replace />} />
      <Route path='pembayaran-spp' element={<Monthly />} />
      <Route path='pembayaran-lainnya' element={<Others />} />
      <Route path='beasiswa' element={<Scholarship />} />
      <Route path='pengeluaran' element={<Expense />} />
      <Route path='transaksi' element={<Transaction />} />
      <Route path='rapbs' element={<Rapbs forceDetail listPath='/keuangan' />} />
      <Route path='laporan' element={<FinanceReport />} />
      <Route path='laporan-tabungan' element={<SavingReport />} />
      <Route path='pengaturan' element={<Setting />} />
    </Route>
  </Route>
);

export default renderCenterRoutes;
