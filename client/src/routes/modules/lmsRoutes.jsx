import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";

const LmsManagement = lazy(
  () => import("../../module/lms/manager/LmsManagement"),
);
const Schedule = lazy(() => import("../../module/lms/schedule/admin/Schedule"));
const TeacherSchedule = lazy(
  () => import("../../module/lms/schedule/teacher/TeacherSchedule"),
);
const Duty = lazy(() => import("../../module/lms/duty/Duty"));
const AdminPointView = lazy(
  () => import("../../module/lms/point/view/AdminPointView"),
);
const TeacherPointView = lazy(
  () => import("../../module/lms/point/view/TeacherPointView"),
);
const SubjectList = lazy(() => import("../../module/lms/student/SubjectList"));

const ParentDash = lazy(
  () => import("../../module/parent/dashboard/ParentDash"),
);
const AcademicReport = lazy(
  () => import("../../module/lms/report/AcademicReport"),
);

// Attendace
const AttendanceConfig = lazy(
  () => import("../../module/lms/attendace/admin/config/AttendanceConfig"),
);

const renderLmsRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin", "teacher"]}
        allowedLevels={["satuan"]}
      />
    }
  >
    <Route
      path='/manajemen-mata-pelajaran'
      element={createElement(LazyRoute, {
        title: "Manajemen Mata Pelajaran",
        Component: LmsManagement,
      })}
    />

    <Route
      path='/manajemen-jadwal'
      element={createElement(LazyRoute, {
        title: "Manajemen Jadwal",
        Component: Schedule,
      })}
    />

    <Route
      path='/jadwal-guru'
      element={createElement(LazyRoute, {
        title: "Jadwal Guru",
        Component: TeacherSchedule,
      })}
    />

    <Route
      path='/manajemen-piket'
      element={createElement(LazyRoute, {
        title: "Manajemen Piket",
        Component: Duty,
      })}
    />

    <Route
      path='/manajemen-presensi'
      element={createElement(LazyRoute, {
        title: "Manajemen Presensi",
        Component: AttendanceConfig,
      })}
    />
  </Route>
);

const renderAdminOnlyLmsRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection allowedRoles={["admin"]} allowedLevels={["satuan"]} />
    }
  >
    <Route
      path='/manajemen-poin'
      element={createElement(LazyRoute, {
        title: "Rule Poin",
        Component: AdminPointView,
      })}
    />
  </Route>
);

const renderTeacherOnlyLmsRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
    <Route
      path='/manajemen-poin-guru'
      element={createElement(LazyRoute, {
        title: "Kelola Poin Siswa",
        Component: TeacherPointView,
      })}
    />
  </Route>
);

const renderStudentLmsRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["student"]} />}>
    <Route
      path='/mata-pelajaran'
      element={createElement(LazyRoute, {
        title: "Mata Pelajaran",
        Component: SubjectList,
      })}
    />
  </Route>
);

const renderParentLmsRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["parent"]} />}>
    <Route
      path='/orangtua-dashboard'
      element={createElement(LazyRoute, {
        title: "Dashboard Orang Tua",
        Component: ParentDash,
      })}
    />

    <Route
      path='/laporan-akademik'
      element={createElement(LazyRoute, {
        title: "Laporan Akademik",
        Component: AcademicReport,
      })}
    />
  </Route>
);

export {
  renderAdminOnlyLmsRoutes,
  renderLmsRoutes,
  renderTeacherOnlyLmsRoutes,
  renderStudentLmsRoutes,
  renderParentLmsRoutes,
};
