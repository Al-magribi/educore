import { lazy } from "react";
import { Route } from "react-router-dom";

import { AppLayout } from "../../components";
import RouteProtection from "../../utils/RouteProtection";

const Profile = lazy(() => import("../../components/profile/Profile"));
const StudentDash = lazy(() => import("../../module/student/dashboard/StudentDash"));
const TeacherDash = lazy(() => import("../../module/teacher/dashboard/TeacherDash"));
const StudentExamList = lazy(
  () => import("../../module/cbt/student/view/StudentExamList"),
);
const StudentSaving = lazy(
  () => import("../../module/finance/student/saving/StudentSaving"),
);

const renderRoleRoutes = ({ LazyPage, NotFoundRedirect, isCbtEnabled }) => (
  <>
    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path="/guru-dashboard"
        element={<LazyPage title="Dashboard Guru" Component={TeacherDash} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path="/siswa-dashboard"
        element={<LazyPage title="Dashboard" Component={StudentDash} />}
      />
      <Route
        path="/siswa/jadwal-ujian"
        element={
          isCbtEnabled ? (
            <LazyPage title="Jadwal Ujian" Component={StudentExamList} />
          ) : (
            <NotFoundRedirect />
          )
        }
      />
      <Route
        path="/siswa/laporan-tabungan"
        element={<LazyPage title="Tabungan Saya" Component={StudentSaving} />}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["parent"]} />}>
      <Route
        path="/orangtua-dashboard"
        element={
          <AppLayout title="Dashboard Orang Tua">
            <div>Halaman Orang Tua</div>
          </AppLayout>
        }
      />
    </Route>

    <Route
      element={
        <RouteProtection
          allowedRoles={["admin", "teacher", "student", "parent"]}
          allowedLevels={["pusat", "satuan", "tahfiz"]}
        />
      }
    >
      <Route
        path="/profile"
        element={<LazyPage title="Profile Saya" Component={Profile} />}
      />
    </Route>
  </>
);

export default renderRoleRoutes;
