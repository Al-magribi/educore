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

const renderLmsRoutes = ({ LazyRoute }) => (
  <Route
    element={
      <RouteProtection
        allowedRoles={["admin", "teacher", "student"]}
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
  </Route>
);

export default renderLmsRoutes;
