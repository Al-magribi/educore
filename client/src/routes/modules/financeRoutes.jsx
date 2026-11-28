import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";
import FinanceDeskAccess from "../../module/finance/access/FinanceDeskAccess";
import FinanceStaffSlotRaw from "../../module/finance/assignment/FinanceStaffSlot";

const FinanceDashRaw = lazy(
  () => import("../../module/finance/dashboard/FinanceDash"),
);
const MonthlyRaw = lazy(() => import("../../module/finance/fee/monthly/Monthly"));
const OthersRaw = lazy(() => import("../../module/finance/fee/others/Others"));
const TransactionRaw = lazy(
  () => import("../../module/finance/fee/transaction/Transaction"),
);
const ScholarshipRaw = lazy(
  () => import("../../module/finance/scholarship/Scholarship"),
);
const ExpenseRaw = lazy(
  () => import("../../module/finance/expense/Expense"),
);
const SavingReportRaw = lazy(
  () => import("../../module/finance/report/SavingReport"),
);
const FinanceReportRaw = lazy(
  () => import("../../module/finance/report/FinanceReport"),
);
const RapbsRaw = lazy(() => import("../../module/finance/rapbs/Rapbs"));
const CashReportRaw = lazy(() => import("../../module/finance/report/CashReport"));
const SettingRaw = lazy(() => import("../../module/finance/setting/Setting"));
const TeacherContributionRaw = lazy(
  () => import("../../module/finance/teacher/contribution/Contribution"),
);
const TeacherSavingRaw = lazy(
  () => import("../../module/finance/teacher/saving/Saving"),
);
const StudentContributionRaw = lazy(
  () => import("../../module/finance/student/contribution/StudentContribution"),
);
const ParentPaymentRaw = lazy(
  () => import("../../module/finance/parent/transaction/ParentTransaction"),
);
const ParentSavingReportRaw = lazy(
  () => import("../../module/finance/report/SavingReport"),
);

// Keuangan Pusat (admin level pusat): daftar homebase lalu shell per homebase.
const CenterFinanceHomeRaw = lazy(
  () => import("../../module/center/finance/CenterFinanceHome"),
);
const CenterFinanceShellRaw = lazy(
  () => import("../../module/center/finance/CenterFinanceShell"),
);
const CenterFinanceReportRaw = lazy(
  () => import("../../module/finance/report/CenterFinanceReport"),
);
const StudentSavingRaw = lazy(
  () => import("../../module/finance/student/saving/StudentSaving"),
);


// Module finance memakai theme Muse (lihat CLAUDE.md).
const FinanceDash = withMuseTheme(FinanceDashRaw);
const Monthly = withMuseTheme(MonthlyRaw);
const Others = withMuseTheme(OthersRaw);
const Transaction = withMuseTheme(TransactionRaw);
const Scholarship = withMuseTheme(ScholarshipRaw);
const Expense = withMuseTheme(ExpenseRaw);
const SavingReport = withMuseTheme(SavingReportRaw);
const FinanceReport = withMuseTheme(FinanceReportRaw);
const Rapbs = withMuseTheme(RapbsRaw);
const CashReport = withMuseTheme(CashReportRaw);
const Setting = withMuseTheme(SettingRaw);
const TeacherContribution = withMuseTheme(TeacherContributionRaw);
const TeacherSaving = withMuseTheme(TeacherSavingRaw);
const StudentContribution = withMuseTheme(StudentContributionRaw);
const ParentPayment = withMuseTheme(ParentPaymentRaw);
const ParentSavingReport = withMuseTheme(ParentSavingReportRaw);
const CenterFinanceHome = withMuseTheme(CenterFinanceHomeRaw);
const CenterFinanceShell = withMuseTheme(CenterFinanceShellRaw);
const CenterFinanceReport = withMuseTheme(CenterFinanceReportRaw);
const StudentSaving = withMuseTheme(StudentSavingRaw);
const FinanceStaffSlot = withMuseTheme(FinanceStaffSlotRaw);

const renderFinanceRoutes = ({ LazyPage }) => {
  const Page = LazyPage;

  return (
    <>
      <Route
        element={
          <FinanceDeskAccess
            allowedLevels={["satuan"]}
            allowFinanceStaff={false}
          />
        }
      >
        <Route
          path='/manajemen-penugasan'
          element={
            <Page title='Penugasan Keuangan' Component={FinanceStaffSlot} />
          }
        />
      </Route>

      <Route
        element={
          <FinanceDeskAccess
            allowedLevels={["finance", "keuangan", "satuan", "pusat"]}
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
          path='/finance/beasiswa'
          element={<Page title='Beasiswa' Component={Scholarship} />}
        />
        <Route
          path='/finance/pengeluaran'
          element={<Page title='Pengeluaran' Component={Expense} />}
        />
        <Route
          path='/finance/transaksi'
          element={<Page title='Transaksi Keuangan' Component={Transaction} />}
        />
        <Route
          path='/finance/laporan'
          element={<Page title='Laporan Keuangan' Component={FinanceReport} />}
        />
        <Route
          path='/finance/laporan/:homebaseId'
          element={<Page title='Laporan Keuangan' Component={FinanceReport} />}
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

      <Route
        element={
          <FinanceDeskAccess allowedLevels={["finance", "keuangan", "pusat"]} />
        }
      >
        <Route
          path='/finance/rapbs'
          element={<Page title='RAPBS / Anggaran' Component={Rapbs} />}
        />
        <Route
          path='/finance/rapbs/:homebaseId'
          element={<Page title='RAPBS / Anggaran' Component={Rapbs} />}
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

      <Route
        element={
          <RouteProtection allowedRoles={["admin"]} allowedLevels={["pusat"]} />
        }
      >
        <Route
          path='/keuangan'
          element={<Page title='Keuangan Pusat' Component={CenterFinanceHome} />}
        />
        <Route path='/keuangan/:homebaseId' element={<CenterFinanceShell />}>
          <Route index element={<Navigate to='pembayaran-spp' replace />} />
          <Route path='pembayaran-spp' element={<Monthly />} />
          <Route path='pembayaran-lainnya' element={<Others />} />
          <Route path='beasiswa' element={<Scholarship />} />
          <Route path='pengeluaran' element={<Expense />} />
          <Route path='transaksi' element={<Transaction />} />
          <Route
            path='rapbs'
            element={<Rapbs forceDetail listPath='/keuangan' />}
          />
          <Route path='laporan' element={<CenterFinanceReport />} />
          <Route path='laporan-tabungan' element={<SavingReport />} />
          <Route path='pengaturan' element={<Setting />} />
        </Route>
      </Route>

      <Route element={<RouteProtection allowedRoles={["student"]} />}>
        <Route
          path='/siswa/laporan-tabungan'
          element={<Page title='Tabungan Saya' Component={StudentSaving} />}
        />
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
