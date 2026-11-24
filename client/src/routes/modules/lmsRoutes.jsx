import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

// Module LMS memakai theme Muse (lihat CLAUDE.md).
const lazyMuse = (loader) => withMuseTheme(lazy(loader));

const LmsManagement = lazyMuse(
  () => import("../../module/lms/manager/LmsManagement"),
);
const Schedule = lazyMuse(() => import("../../module/lms/schedule/admin/Schedule"));
const TeacherSchedule = lazyMuse(
  () => import("../../module/lms/schedule/teacher/TeacherSchedule"),
);
const Duty = lazyMuse(() => import("../../module/lms/duty/Duty"));
const AdminPointView = lazyMuse(
  () => import("../../module/lms/point/view/AdminPointView"),
);
const StaffAssignment = lazyMuse(
  () => import("../../module/lms/assignment/StaffAssignment"),
);
const BukuIndukList = lazyMuse(() => import("../../module/lms/tu/BukuIndukList"));
const BukuIndukDetail = lazyMuse(
  () => import("../../module/lms/tu/BukuIndukDetail"),
);
const MutasiSiswa = lazyMuse(() => import("../../module/lms/tu/MutasiSiswa"));
const AlumniPage = lazyMuse(() => import("../../module/lms/tu/AlumniPage"));
const IjazahPage = lazyMuse(() => import("../../module/lms/tu/IjazahPage"));
const SuratPage = lazyMuse(() => import("../../module/lms/tu/SuratPage"));
const SaranaPage = lazyMuse(() => import("../../module/lms/tu/SaranaPage"));
const TeacherPointView = lazyMuse(
  () => import("../../module/lms/point/view/TeacherPointView"),
);
const StudentPointView = lazyMuse(
  () => import("../../module/lms/point/view/StudentPointView"),
);
const ParentPointView = lazyMuse(
  () => import("../../module/lms/point/view/ParentPointView"),
);
const SubjectList = lazyMuse(() => import("../../module/lms/student/SubjectList"));
const TeachingModuleMonitoring = lazyMuse(
  () =>
    import("../../module/lms/teachingModule/monitoring/TeachingModuleMonitoring"),
);

const ParentDash = lazy(
  () => import("../../module/parent/dashboard/ParentDash"),
);
const AcademicReport = lazyMuse(
  () => import("../../module/lms/report/AcademicReport"),
);

// Attendace
const AttendanceConfig = lazyMuse(
  () => import("../../module/lms/attendance/config/AttendanceConfig"),
);
const AttendanceReport = lazyMuse(
  () => import("../../module/lms/attendance/report/AttendanceReport"),
);

const ClassAttendance = lazyMuse(
  () => import("../../module/lms/attendance/class/ClassAttendance"),
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
  <>
    <Route
      element={
        <RouteProtection allowedRoles={["admin"]} allowedLevels={["satuan"]} />
      }
    >
      <Route
        path='/manajemen-penugasan'
        element={createElement(LazyRoute, {
          title: "Penugasan Wewenang",
          Component: StaffAssignment,
        })}
      />
    </Route>
    <Route
      element={
        <RouteProtection
          allowedRoles={["admin", "teacher"]}
          allowedLevels={["satuan"]}
          allowedAssignments={["kesiswaan"]}
        />
      }
    >
      <Route
        path='/manajemen-poin'
        element={createElement(LazyRoute, {
          title: "Manajemen Poin",
          Component: AdminPointView,
        })}
      />
    </Route>
    <Route
      element={
        <RouteProtection
          allowedRoles={["admin", "teacher"]}
          allowedLevels={["satuan"]}
          allowedAssignments={["kurikulum"]}
        />
      }
    >
      <Route
        path='/monitoring-modul-ajar'
        element={createElement(LazyRoute, {
          title: "Monitoring Modul Ajar",
          Component: TeachingModuleMonitoring,
        })}
      />
    </Route>
  </>
);

const renderAttendanceReportRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin", "teacher"]}
        allowedLevels={["satuan", "pusat"]}
        allowedAssignments={["kurikulum"]}
      />
    }
  >
    <Route
      path='/laporan-presensi'
      element={createElement(LazyRoute, {
        title: "Laporan Presensi",
        Component: AttendanceReport,
      })}
    />
  </Route>
);

const renderClassAttendanceRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["teacher", "student"]} />}>
    <Route
      path='/presensi-kelas'
      element={createElement(LazyRoute, {
        title: "Presensi",
        Component: ClassAttendance,
      })}
    />
  </Route>
);

const renderTeacherOnlyLmsRoutes = ({ LazyRoute }) => (
  <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
    <Route
      path='/manajemen-poin-guru'
      element={createElement(LazyRoute, {
        title: "Poin Siswa",
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
    <Route
      path='/poin-siswa'
      element={createElement(LazyRoute, {
        title: "Poin Siswa",
        Component: StudentPointView,
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

    <Route
      path='/poin-anak'
      element={createElement(LazyRoute, {
        title: "Poin Siswa",
        Component: ParentPointView,
      })}
    />
  </Route>
);

const renderTuRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin", "teacher"]}
        allowedLevels={["satuan"]}
        allowedAssignments={["tu"]}
      />
    }
  >
    <Route
      path="/tata-usaha/buku-induk"
      element={createElement(LazyRoute, {
        title: "Buku Induk",
        Component: BukuIndukList,
      })}
    />
    <Route
      path="/tata-usaha/buku-induk/:id"
      element={createElement(LazyRoute, {
        title: "Buku Induk",
        Component: BukuIndukDetail,
      })}
    />
    <Route
      path="/tata-usaha/mutasi"
      element={createElement(LazyRoute, {
        title: "Mutasi Siswa",
        Component: MutasiSiswa,
      })}
    />
    <Route
      path="/tata-usaha/alumni"
      element={createElement(LazyRoute, {
        title: "Data Alumni",
        Component: AlumniPage,
      })}
    />
    <Route
      path="/tata-usaha/ijazah"
      element={createElement(LazyRoute, {
        title: "Ijazah",
        Component: IjazahPage,
      })}
    />
    <Route
      path="/tata-usaha/surat"
      element={createElement(LazyRoute, {
        title: "Arsip Surat",
        Component: SuratPage,
      })}
    />
    <Route
      path="/tata-usaha/sarana"
      element={createElement(LazyRoute, {
        title: "Sarana dan Prasarana",
        Component: SaranaPage,
      })}
    />
  </Route>
);

export {
  renderAdminOnlyLmsRoutes,
  renderAttendanceReportRoutes,
  renderClassAttendanceRoutes,
  renderLmsRoutes,
  renderTuRoutes,
  renderTeacherOnlyLmsRoutes,
  renderStudentLmsRoutes,
  renderParentLmsRoutes,
};

// Satu pintu untuk App.jsx (menerima routeContext dari main).
const renderAllLmsRoutes = (context) => (
  <>
    {renderLmsRoutes(context)}
    {renderAdminOnlyLmsRoutes(context)}
    {renderTuRoutes(context)}
    {renderAttendanceReportRoutes(context)}
    {renderClassAttendanceRoutes(context)}
    {renderTeacherOnlyLmsRoutes(context)}
    {renderStudentLmsRoutes(context)}
    {renderParentLmsRoutes(context)}
  </>
);

export default renderAllLmsRoutes;
