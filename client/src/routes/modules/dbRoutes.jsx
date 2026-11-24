import { createElement, lazy } from "react";
import { App } from "antd";
import { Route } from "react-router-dom";

import RouteProtection from "../../utils/RouteProtection";
import withMuseTheme from "../../components/ui/muse/withMuseTheme";

const DatabaseManager = lazy(
  () => import("../../module/database/manager/DatabaseManager"),
);
const ClassDbManager = lazy(
  () => import("../../module/database/manager/ClassDbManager"),
);
const StudentDatabase = lazy(
  () => import("../../module/database/view/StudentDatabase"),
);
const ParentStudentDatabase = lazy(
  () => import("../../module/database/view/ParentStudentDatabase"),
);

// Module database memakai theme Muse (lihat CLAUDE.md). App antd dipasang agar
// App.useApp() (message/modal) ikut theme yang sama.
const withDbTheme = (Component) =>
  withMuseTheme((props) =>
    createElement(App, { component: false }, createElement(Component, props)),
  );

const DatabaseManagerPage = withDbTheme(DatabaseManager);
const ClassDbManagerPage = withDbTheme(ClassDbManager);
const StudentDatabasePage = withDbTheme(StudentDatabase);
const ParentStudentDatabasePage = withDbTheme(ParentStudentDatabase);

const renderDbRoutes = ({ LazyPage }) => (
  <>
    <Route
      element={
        <RouteProtection allowedRoles={["admin"]} allowedLevels={["satuan"]} />
      }
    >
      <Route
        path="/admin-database"
        element={createElement(LazyPage, { title: "Database Siswa", Component: DatabaseManagerPage })}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["teacher"]} />}>
      <Route
        path="/guru-database-kelas"
        element={createElement(LazyPage, { title: "Database Kelas", Component: ClassDbManagerPage })}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["student"]} />}>
      <Route
        path="/siswa-database"
        element={createElement(LazyPage, { title: "Database Siswa", Component: StudentDatabasePage })}
      />
    </Route>

    <Route element={<RouteProtection allowedRoles={["parent"]} />}>
      <Route
        path="/orangtua-database-siswa"
        element={createElement(LazyPage, { title: "Database Anak", Component: ParentStudentDatabasePage })}
      />
    </Route>
  </>
);

export default renderDbRoutes;
