import { createElement, lazy } from "react";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

const Profile = withMuseTheme(lazy(() => import("../../components/profile/Profile")));
const StudentDash = withMuseTheme(
  lazy(() => import("../../module/student/dashboard/StudentDash")),
);
const TeacherDash = withMuseTheme(
  lazy(() => import("../../module/teacher/dashboard/TeacherDash")),
);
const ParentDash = withMuseTheme(
  lazy(() => import("../../module/parent/dashboard/ParentDash")),
);
const StudentExamList = lazy(
  () => import("../../module/cbt/student/view/StudentExamList"),
);
const StudentExamListPage = withMuseTheme(StudentExamList);

const renderRoleRoutes = ({ LazyPage, NotFoundRedirect, isCbtEnabled }) => (
  <>
    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path="/guru-dashboard"
        element={createElement(LazyPage, {
          title: "Dashboard Guru",
          Component: TeacherDash,
        })}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path="/siswa-dashboard"
        element={createElement(LazyPage, {
          title: "Dashboard",
          Component: StudentDash,
        })}
      />
      <Route
        path="/siswa/jadwal-ujian"
        element={
          isCbtEnabled ? (
            createElement(LazyPage, {
              title: "Jadwal Ujian",
              Component: StudentExamListPage,
            })
          ) : (
            createElement(NotFoundRedirect)
          )
        }
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["parent"]} />}>
      <Route
        path="/orangtua-dashboard"
        element={createElement(LazyPage, {
          title: "Dashboard Orang Tua",
          Component: ParentDash,
        })}
      />
    </Route>

    <Route
      element={
        <RouteProtection
          allowedRoles={["admin", "teacher", "student", "parent", "staff"]}
          allowedLevels={["pusat", "satuan", "tahfiz"]}
        />
      }
    >
      <Route
        path="/profile"
        element={createElement(LazyPage, {
          title: "Profile Saya",
          Component: Profile,
        })}
      />
    </Route>
  </>
);

export default renderRoleRoutes;
