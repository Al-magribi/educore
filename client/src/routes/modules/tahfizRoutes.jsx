import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const TahfizDashboard = lazy(
  () => import("../../module/tahfiz/dashboard/TahfizDashboard"),
);
const Alquran = lazy(() => import("../../module/tahfiz/alquran/view/Alquran"));
const Halaqoh = lazy(() => import("../../module/tahfiz/halaqoh/view/Halaqoh"));
const Target = lazy(() => import("../../module/tahfiz/target/Target"));
const TahfizAdminReport = lazy(
  () => import("../../module/tahfiz/report/TahfizAdminReport"),
);
const TahfizTeacherReport = lazy(
  () => import("../../module/tahfiz/report/TahfizTeacherReport"),
);
const TahfizStudentReport = lazy(
  () => import("../../module/tahfiz/report/TahfizStudentReport"),
);
const TahfizParentReport = lazy(
  () => import("../../module/tahfiz/report/TahfizParentReport"),
);
const DailyReport = lazy(() => import("../../module/tahfiz/report/DailyReport"));
const MusyrifDash = lazy(
  () => import("../../module/tahfiz/musyrif/MusyrifDash"),
);
const MusyrifHalaqoh = lazy(
  () => import("../../module/tahfiz/musyrif/MusyrifHalaqoh"),
);
const MusyrifReport = lazy(
  () => import("../../module/tahfiz/musyrif/MusyrifReport"),
);

const renderTahfizAdminRoutes = ({ LazyPage } = {}) =>
  LazyPage ? (
    <Route
      element={
        <RouteProtection allowedRoles={["admin"]} allowedLevels={["tahfiz"]} />
      }
    >
      <Route
        path='/tahfiz-dashboard'
        element={createElement(LazyPage, {
          title: "Dashboard Tahfiz",
          Component: TahfizDashboard,
        })}
      />
      <Route
        path='/tahfiz-alquran'
        element={createElement(LazyPage, {
          title: "Referensi Al-Qur'an",
          Component: Alquran,
        })}
      />
      <Route
        path='/tahfiz-halaqoh'
        element={createElement(LazyPage, {
          title: "Manajemen Halaqoh",
          Component: Halaqoh,
        })}
      />
      <Route
        path='/tahfiz-target'
        element={createElement(LazyPage, {
          title: "Target Tahfiz",
          Component: Target,
        })}
      />
      <Route
        path='/tahfiz-penilaian'
        element={createElement(LazyPage, {
          title: "Manajemen Halaqoh",
          Component: Halaqoh,
        })}
      />
      <Route
        path='/tahfiz-hafalan'
        element={createElement(LazyPage, {
          title: "Target Tahfiz",
          Component: Target,
        })}
      />
      <Route
        path='/tahfiz-daily-report'
        element={createElement(LazyPage, {
          title: "Setoran Hafalan - Admin Tahfiz",
          Component: DailyReport,
        })}
      />
      <Route
        path='/tahfiz-report'
        element={createElement(LazyPage, {
          title: "Laporan Tahfiz - Admin",
          Component: TahfizAdminReport,
        })}
      />
    </Route>
  ) : null;

const renderTahfizMusyrifRoutes = ({ LazyPage } = {}) =>
  LazyPage ? (
    <Route
      element={
        <RouteProtection
          allowedRoles={["admin"]}
          allowedLevels={["tahfiz"]}
          requireMusyrif
        />
      }
    >
      <Route
        path='/tahfiz-musyrif-dashboard'
        element={createElement(LazyPage, {
          title: "Dashboard Musyrif",
          Component: MusyrifDash,
        })}
      />
      <Route
        path='/tahfiz-musyrif-halaqoh'
        element={createElement(LazyPage, {
          title: "Halaqoh Musyrif",
          Component: MusyrifHalaqoh,
        })}
      />
      <Route
        path='/tahfiz-musyrif-report'
        element={createElement(LazyPage, {
          title: "Laporan Musyrif",
          Component: MusyrifReport,
        })}
      />
    </Route>
  ) : null;

const renderTahfizTeacherRoutes = ({ LazyPage } = {}) =>
  LazyPage ? (
    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path='/tahfiz-teacher-daily-report'
        element={createElement(LazyPage, {
          title: "Setoran Hafalan - Wali Kelas",
          Component: DailyReport,
        })}
      />
      <Route
        path='/tahfiz-teacher-report'
        element={createElement(LazyPage, {
          title: "Laporan Tahfiz - Guru",
          Component: TahfizTeacherReport,
        })}
      />
    </Route>
  ) : null;

const renderTahfizPersonalRoutes = ({ LazyPage } = {}) =>
  LazyPage ? (
    <>
      <Route element={<RouteProtection allowedRoles={["student"]} />}>
        <Route
          path='/tahfiz-student-report'
          element={createElement(LazyPage, {
            title: "Laporan Tahfiz - Siswa",
            Component: TahfizStudentReport,
          })}
        />
      </Route>
      <Route element={<RouteProtection allowedRoles={["parent"]} />}>
        <Route
          path='/tahfiz-parent-report'
          element={createElement(LazyPage, {
            title: "Laporan Tahfiz - Orang Tua",
            Component: TahfizParentReport,
          })}
        />
      </Route>
    </>
  ) : null;

const renderTahfizRoutes = ({ LazyPage } = {}) => (
  <>
    {renderTahfizAdminRoutes({ LazyPage })}
    {renderTahfizTeacherRoutes({ LazyPage })}
    {renderTahfizMusyrifRoutes({ LazyPage })}
    {renderTahfizPersonalRoutes({ LazyPage })}
  </>
);

export default renderTahfizRoutes;
